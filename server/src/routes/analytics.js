// Analitica financiera para el tablero.
//
// Los graficos consumen agregados, no cientos de movimientos crudos. Todo se
// calcula en la base y mantiene la convencion del dominio: centavos enteros,
// gastos negativos y monedas siempre separadas.

import { collection } from "../db/index.js";
import { diasDelMes, nombreDelMes, normalizarPeriodo } from "../domain/dates.js";
import { badRequest } from "../http/errors.js";

const MONEDAS = new Set(["COP", "USD"]);
const SIN_CATEGORIA = "Sin categoría";

function fechaIso(valor) {
  return valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor).slice(0, 10);
}

function desplazarMes(anio, mes, diferencia) {
  const fecha = new Date(Date.UTC(anio, mes - 1 + diferencia, 1));
  return { anio: fecha.getUTCFullYear(), mes: fecha.getUTCMonth() + 1 };
}

function claveMes(anio, mes) {
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

function compararPeriodo(a, b) {
  return a.anio === b.anio ? a.mes - b.mes : a.anio - b.anio;
}

function leerConsulta(request) {
  const hoy = new Date();
  const anio = request.query?.anio ?? String(hoy.getUTCFullYear());
  const mes = request.query?.mes ?? String(hoy.getUTCMonth() + 1);
  const periodo = normalizarPeriodo(anio, mes);
  if (!periodo) throw badRequest("El año o el mes no son válidos.");

  const moneda = String(request.query?.moneda ?? "COP").toUpperCase();
  if (!MONEDAS.has(moneda)) throw badRequest("La moneda debe ser COP o USD.");

  const meses = Number.parseInt(request.query?.meses ?? "6", 10);
  if (!Number.isInteger(meses) || meses < 3 || meses > 24) {
    throw badRequest("El rango debe estar entre 3 y 24 meses.");
  }

  return { ...periodo, moneda, meses };
}

export default async function analyticsRoutes(app) {
  app.get("/api/analitica", async (request) => {
    const { anio, mes, moneda, meses } = leerConsulta(request);
    const inicio = desplazarMes(anio, mes, -(meses - 1));
    const fin = desplazarMes(anio, mes, 1);
    const desde = `${inicio.anio}-${String(inicio.mes).padStart(2, "0")}-01`;
    const hasta = `${fin.anio}-${String(fin.mes).padStart(2, "0")}-01`;
    const desdeMes = `${anio}-${String(mes).padStart(2, "0")}-01`;

    const datos = await (async () => {
      const movements = collection("movements");
      const monthFilter = { currency: moneda, occurred_on: { $gte: desdeMes, $lt: hasta } };
      const [mensuales, diarios, categorias, mayorGasto] = await Promise.all([
        movements.aggregate([
          { $match: { currency: moneda, occurred_on: { $gte: desde, $lt: hasta } } },
          {
            $group: {
              _id: {
                anio: { $toInt: { $substrBytes: ["$occurred_on", 0, 4] } },
                mes: { $toInt: { $substrBytes: ["$occurred_on", 5, 2] } },
                sentido: "$direction",
              },
              centavos: { $sum: "$amount_cents" },
              movimientos: { $sum: 1 },
            },
          },
          { $project: { _id: 0, anio: "$_id.anio", mes: "$_id.mes", sentido: "$_id.sentido", centavos: 1, movimientos: 1 } },
          { $sort: { anio: 1, mes: 1 } },
        ]).toArray(),
        movements.aggregate([
          { $match: monthFilter },
          { $group: { _id: { fecha: "$occurred_on", sentido: "$direction" }, centavos: { $sum: "$amount_cents" }, movimientos: { $sum: 1 } } },
          { $project: { _id: 0, fecha: "$_id.fecha", sentido: "$_id.sentido", centavos: 1, movimientos: 1 } },
          { $sort: { fecha: 1 } },
        ]).toArray(),
        movements.aggregate([
          { $match: { ...monthFilter, direction: "gasto" } },
          { $group: { _id: { $ifNull: ["$category", SIN_CATEGORIA] }, centavos: { $sum: "$amount_cents" }, movimientos: { $sum: 1 } } },
          { $project: { _id: 0, categoria: "$_id", centavos: 1, movimientos: 1 } },
          { $sort: { centavos: 1 } },
        ]).toArray(),
        movements.findOne(
          { ...monthFilter, direction: "gasto" },
          { sort: { amount_cents: 1, occurred_on: -1 } },
        ),
      ]);

      if (mayorGasto) {
        mayorGasto.cuenta = (await collection("accounts").findOne({ id: mayorGasto.account_id }))?.name ?? null;
      }
      return {
        mensuales,
        diarios,
        categorias,
        mayorGasto: mayorGasto ? {
          fecha: mayorGasto.occurred_on,
          descripcion: mayorGasto.description,
          centavos: mayorGasto.amount_cents,
          categoria: mayorGasto.category ?? SIN_CATEGORIA,
          cuenta: mayorGasto.cuenta,
        } : null,
      };
    })();

    const porMes = new Map();
    for (const fila of datos.mensuales) {
      const clave = claveMes(fila.anio, fila.mes);
      const actual = porMes.get(clave) ?? {
        ingresosCentavos: 0,
        gastosCentavos: 0,
        movimientos: 0,
      };
      if (fila.sentido === "ingreso") actual.ingresosCentavos = Number(fila.centavos);
      else actual.gastosCentavos = Number(fila.centavos);
      actual.movimientos += fila.movimientos;
      porMes.set(clave, actual);
    }

    const serieMensual = Array.from({ length: meses }, (_, indice) => {
      const periodo = desplazarMes(inicio.anio, inicio.mes, indice);
      const agregado = porMes.get(claveMes(periodo.anio, periodo.mes)) ?? {
        ingresosCentavos: 0,
        gastosCentavos: 0,
        movimientos: 0,
      };
      const netoCentavos = agregado.ingresosCentavos + agregado.gastosCentavos;
      const tasaAhorro = agregado.ingresosCentavos > 0
        ? Math.round((netoCentavos / agregado.ingresosCentavos) * 1000) / 10
        : null;

      return {
        ...periodo,
        nombreMes: nombreDelMes(periodo.mes),
        etiqueta: `${nombreDelMes(periodo.mes).slice(0, 3)} ${String(periodo.anio).slice(2)}`,
        ...agregado,
        netoCentavos,
        tasaAhorro,
      };
    });

    const dias = diasDelMes(anio, mes);
    const porDia = new Map();
    for (const fila of datos.diarios) {
      const fecha = fechaIso(fila.fecha);
      const actual = porDia.get(fecha) ?? {
        ingresosCentavos: 0,
        gastosCentavos: 0,
        movimientos: 0,
      };
      if (fila.sentido === "ingreso") actual.ingresosCentavos = Number(fila.centavos);
      else actual.gastosCentavos = Number(fila.centavos);
      actual.movimientos += fila.movimientos;
      porDia.set(fecha, actual);
    }

    let acumulado = 0;
    const serieDiaria = Array.from({ length: dias }, (_, indice) => {
      const dia = indice + 1;
      const fecha = `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      const agregado = porDia.get(fecha) ?? {
        ingresosCentavos: 0,
        gastosCentavos: 0,
        movimientos: 0,
      };
      const netoCentavos = agregado.ingresosCentavos + agregado.gastosCentavos;
      acumulado += netoCentavos;
      return { dia, fecha, ...agregado, netoCentavos, acumuladoCentavos: acumulado };
    });

    const totalCategorias = datos.categorias.reduce(
      (suma, fila) => suma + Math.abs(Number(fila.centavos)),
      0,
    );
    const categorias = datos.categorias.map((fila) => ({
      categoria: fila.categoria,
      centavos: Number(fila.centavos),
      magnitudCentavos: Math.abs(Number(fila.centavos)),
      movimientos: fila.movimientos,
      porcentaje: totalCategorias > 0
        ? Math.round((Math.abs(Number(fila.centavos)) / totalCategorias) * 1000) / 10
        : 0,
    }));

    const mesesConActividad = serieMensual.filter((fila) => fila.movimientos > 0);
    const sumar = (campo) => mesesConActividad.reduce((suma, fila) => suma + fila[campo], 0);
    const promedio = (campo) => mesesConActividad.length > 0
      ? Math.round(sumar(campo) / mesesConActividad.length)
      : 0;
    const mejorMes = mesesConActividad.length > 0
      ? mesesConActividad.reduce((mejor, fila) => fila.netoCentavos > mejor.netoCentavos ? fila : mejor)
      : null;
    const peorMes = mesesConActividad.length > 0
      ? mesesConActividad.reduce((peor, fila) => fila.netoCentavos < peor.netoCentavos ? fila : peor)
      : null;

    const hoy = new Date();
    const periodoActual = { anio: hoy.getUTCFullYear(), mes: hoy.getUTCMonth() + 1 };
    const limiteDias = compararPeriodo({ anio, mes }, periodoActual) === 0
      ? hoy.getUTCDate()
      : compararPeriodo({ anio, mes }, periodoActual) < 0 ? dias : 0;
    const transcurridos = Math.min(limiteDias, dias);
    const diasConGasto = serieDiaria
      .slice(0, transcurridos)
      .filter((fila) => fila.gastosCentavos < 0).length;
    const mesSeleccionado = serieMensual.at(-1);
    const proyeccionGastosCentavos = transcurridos > 0 && transcurridos < dias
      ? Math.round((mesSeleccionado.gastosCentavos / transcurridos) * dias)
      : null;

    return {
      periodo: { anio, mes, nombreMes: nombreDelMes(mes), dias, diasTranscurridos: transcurridos },
      moneda,
      meses,
      serieMensual,
      serieDiaria,
      categorias,
      indicadores: {
        promedioIngresosCentavos: promedio("ingresosCentavos"),
        promedioGastosCentavos: promedio("gastosCentavos"),
        promedioNetoCentavos: promedio("netoCentavos"),
        tasaAhorro: mesSeleccionado.tasaAhorro,
        diasSinGasto: Math.max(transcurridos - diasConGasto, 0),
        diasConGasto,
        proyeccionGastosCentavos,
        mejorMes: mejorMes ? {
          anio: mejorMes.anio,
          mes: mejorMes.mes,
          nombreMes: mejorMes.nombreMes,
          netoCentavos: mejorMes.netoCentavos,
        } : null,
        peorMes: peorMes ? {
          anio: peorMes.anio,
          mes: peorMes.mes,
          nombreMes: peorMes.nombreMes,
          netoCentavos: peorMes.netoCentavos,
        } : null,
        mayorGasto: datos.mayorGasto ? {
          fecha: fechaIso(datos.mayorGasto.fecha),
          descripcion: datos.mayorGasto.descripcion,
          centavos: Number(datos.mayorGasto.centavos),
          categoria: datos.mayorGasto.categoria,
          cuenta: datos.mayorGasto.cuenta,
        } : null,
      },
    };
  });
}
