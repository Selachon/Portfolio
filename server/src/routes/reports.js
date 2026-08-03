// Reportes mensuales: ver el mes, dejar notas, cerrarlo y exportarlo.
//
// Un reporte cerrado guarda una foto de sus totales. Si más adelante se corrige
// un movimiento de ese mes, el reporte cerrado sigue diciendo lo que se firmó
// —que es justo lo que se espera de un cierre contable— y el portal avisa de
// que el cálculo actual ya no coincide.

import { audit } from "../audit.js";
import { collection, createUpsertDocument, transaction } from "../db/index.js";
import { badRequest, conflict, notFound } from "../http/errors.js";
import { requireRole } from "../auth/guard.js";
import { normalizarPeriodo, nombreDelMes } from "../domain/dates.js";
import { formatCents } from "../domain/money.js";
import { calcularComparativa, calcularTotales, extractosDelPeriodo } from "../repos/reports.js";
import { asegurarRango, convertirCentavos, tasaParaFecha } from "../services/tasas.js";

const MONEDAS = new Set(["COP", "USD"]);

function leerPeriodo(request) {
  const periodo = normalizarPeriodo(request.params.anio, request.params.mes);
  if (!periodo) throw badRequest("El año o el mes no son válidos.");

  const moneda = (request.query?.moneda ?? "COP").toUpperCase();
  if (!MONEDAS.has(moneda)) throw badRequest("La moneda debe ser COP o USD.");

  return { ...periodo, moneda };
}

function reportePublico(fila) {
  if (!fila) return null;
  return {
    id: fila.id,
    anio: fila.period_year,
    mes: fila.period_month,
    moneda: fila.currency,
    estado: fila.status,
    notas: fila.notes,
    cerradoEn: fila.closed_at,
    totalesCongelados: fila.totals,
  };
}

export default async function reportRoutes(app) {
  // Meses con actividad: alimenta el selector del portal.
  app.get("/api/reportes", async () => {
    const rows = await collection("movements").aggregate([
      {
        $group: {
          _id: {
            anio: { $toInt: { $substrBytes: ["$occurred_on", 0, 4] } },
            mes: { $toInt: { $substrBytes: ["$occurred_on", 5, 2] } },
            moneda: "$currency",
          },
          movimientos: { $sum: 1 },
          neto: { $sum: "$amount_cents" },
        },
      },
      { $project: { _id: 0, anio: "$_id.anio", mes: "$_id.mes", moneda: "$_id.moneda", movimientos: 1, neto: 1 } },
      { $sort: { anio: -1, mes: -1, moneda: 1 } },
    ]).toArray();

    const guardados = await collection("reports").find({}).toArray();
    const porClave = new Map(
      guardados.map((fila) => [`${fila.period_year}-${fila.period_month}-${fila.currency}`, fila]),
    );

    return {
      periodos: rows.map((fila) => {
        const reporte = porClave.get(`${fila.anio}-${fila.mes}-${fila.moneda}`);
        return {
          anio: fila.anio,
          mes: fila.mes,
          nombreMes: nombreDelMes(fila.mes),
          moneda: fila.moneda,
          movimientos: fila.movimientos,
          netoCentavos: Number(fila.neto),
          estado: reporte?.status ?? "sin-reporte",
        };
      }),
    };
  });

  app.get("/api/reportes/:anio/:mes", async (request) => {
    const { anio, mes, moneda } = leerPeriodo(request);
    const cuentaId = request.query?.cuenta ?? null;

    const datos = await transaction(async (client) => {
      const totales = await calcularTotales(client, { anio, mes, moneda, cuentaId });
      const comparativa = await calcularComparativa(client, { anio, mes, moneda, cuentaId });
      const extractos = await extractosDelPeriodo(client, { anio, mes, moneda });
      return { totales, comparativa, extractos };
    });

    // Equivalencia en la otra moneda, solo para mirar. Se usa la tasa del
    // último día del mes, que es como se cierra un periodo contable.
    let equivalencia = null;
    const convertirA = (request.query?.convertirA ?? "").toUpperCase();

    if ((convertirA === "COP" || convertirA === "USD") && convertirA !== moneda) {
      const ultimoDia = `${anio}-${String(mes).padStart(2, "0")}-${String(datos.totales.periodo.dias).padStart(2, "0")}`;
      await asegurarRango(ultimoDia, ultimoDia, { log: request.log });
      const tasa = await tasaParaFecha(ultimoDia);

      if (tasa) {
        const convertir = (centavos) =>
          convertirCentavos(centavos, tasa.tasaMicro, { de: moneda, a: convertirA });

        equivalencia = {
          moneda: convertirA,
          tasa: { fecha: tasa.fecha, pesosPorDolar: tasa.tasaMicro / 1_000_000, fuente: tasa.fuente, exacta: tasa.exacta },
          ingresosCentavos: convertir(datos.totales.ingresosCentavos),
          gastosCentavos: convertir(datos.totales.gastosCentavos),
          totalCentavos: convertir(datos.totales.totalCentavos),
          promedioDiarioCentavos: convertir(datos.totales.promedioDiarioCentavos),
        };
      }
    }

    const guardado = await collection("reports").findOne({ period_year: anio, period_month: mes, currency: moneda });

    // Si el mes está cerrado y las cifras de hoy no coinciden con las
    // congeladas, hay que decirlo en vez de mostrar dos verdades a la vez.
    let descuadre = null;
    if (guardado?.status === "cerrado" && guardado.totals) {
      const congelado = guardado.totals;
      if (
        congelado.totalCentavos !== datos.totales.totalCentavos ||
        congelado.movimientos !== datos.totales.movimientos
      ) {
        descuadre = {
          mensaje:
            "Este mes está cerrado, pero sus movimientos cambiaron después del cierre. " +
            "El reporte firmado conserva las cifras originales.",
          congelado: {
            totalCentavos: congelado.totalCentavos,
            movimientos: congelado.movimientos,
          },
          actual: {
            totalCentavos: datos.totales.totalCentavos,
            movimientos: datos.totales.movimientos,
          },
        };
      }
    }

    return {
      reporte: reportePublico(guardado),
      ...datos,
      equivalencia,
      descuadre,
    };
  });

  app.put("/api/reportes/:anio/:mes/notas", async (request) => {
    const { anio, mes, moneda } = leerPeriodo(request);
    const notas = typeof request.body?.notas === "string" ? request.body.notas : "";

    const reports = collection("reports");
    const filter = { period_year: anio, period_month: mes, currency: moneda };
    const guardado = await reports.findOne(filter);

    if (guardado?.status === "cerrado") {
      throw conflict("El mes está cerrado. Reábrelo si necesitas cambiar las notas.");
    }

    const report = await reports.findOneAndUpdate(
      filter,
      {
        $set: { notes: notas, updated_at: new Date() },
        $setOnInsert: createUpsertDocument({ ...filter, status: "borrador", totals: null, closed_at: null, closed_by: null, created_by: request.user.id }),
      },
      { upsert: true, returnDocument: "after" },
    );

    await audit(request, {
      action: "reporte.notas",
      entity: "report",
      entityId: report.id,
      meta: { anio, mes, moneda },
    });

    return { reporte: reportePublico(report) };
  });

  app.post("/api/reportes/:anio/:mes/cerrar", async (request) => {
    const { anio, mes, moneda } = leerPeriodo(request);

    const reports = collection("reports");
    const filter = { period_year: anio, period_month: mes, currency: moneda };
    const guardado = await reports.findOne(filter);
    if (guardado?.status === "cerrado") throw conflict("Ese mes ya estaba cerrado.");

    const totales = await transaction((client) => calcularTotales(client, { anio, mes, moneda }));
    if (totales.movimientos === 0) {
      throw badRequest("No se puede cerrar un mes sin movimientos.");
    }

    const now = new Date();
    const report = await reports.findOneAndUpdate(
      filter,
      {
        $set: {
          status: "cerrado",
          totals: totales,
          notes: request.body?.notas ?? guardado?.notes ?? null,
          closed_at: now,
          closed_by: request.user.id,
          updated_at: now,
        },
        $setOnInsert: createUpsertDocument({ ...filter, created_by: request.user.id }),
      },
      { upsert: true, returnDocument: "after" },
    );

    await audit(request, {
      action: "reporte.cerrado",
      entity: "report",
      entityId: report.id,
      meta: { anio, mes, moneda, total: formatCents(totales.totalCentavos) },
    });

    return { reporte: reportePublico(report), totales };
  });

  // Reabrir es del propietario: deshace una firma.
  app.post("/api/reportes/:anio/:mes/reabrir", { preHandler: requireRole("owner") }, async (request) => {
    const { anio, mes, moneda } = leerPeriodo(request);

    const reports = collection("reports");
    const guardado = await reports.findOne({ period_year: anio, period_month: mes, currency: moneda });
    if (!guardado) throw notFound("Ese mes no tiene reporte.");
    if (guardado.status !== "cerrado") throw conflict("Ese mes no está cerrado.");

    const report = await reports.findOneAndUpdate(
      { id: guardado.id },
      { $set: { status: "borrador", closed_at: null, closed_by: null, updated_at: new Date() } },
      { returnDocument: "after" },
    );

    await audit(request, {
      action: "reporte.reabierto",
      entity: "report",
      entityId: guardado.id,
      meta: { anio, mes, moneda, totalesQueTenia: guardado.totals?.totalCentavos },
    });

    return { reporte: reportePublico(report) };
  });

  app.get("/api/reportes/:anio/:mes/export.csv", async (request, reply) => {
    const { anio, mes, moneda } = leerPeriodo(request);
    const totales = await transaction((client) => calcularTotales(client, { anio, mes, moneda }));

    const escapar = (valor) => `"${String(valor ?? "").replace(/"/g, '""')}"`;
    const lineas = [
      `Reporte ${nombreDelMes(mes)} ${anio} (${moneda})`,
      "",
      "GASTOS,Valor,Movimientos",
      ...totales.gastos.map((f) => [escapar(f.categoria), formatCents(f.centavos), f.movimientos].join(",")),
      `Suma total,${formatCents(totales.gastosCentavos)},`,
      "",
      "INGRESOS,Valor,Movimientos",
      ...totales.ingresos.map((f) => [escapar(f.categoria), formatCents(f.centavos), f.movimientos].join(",")),
      `Suma total,${formatCents(totales.ingresosCentavos)},`,
      "",
      `INGRESOS,${formatCents(totales.ingresosCentavos)},`,
      `GASTOS,${formatCents(totales.gastosCentavos)},`,
      `TOTAL,${formatCents(totales.totalCentavos)},`,
      `PROMEDIO DIARIO LIBRE,${formatCents(totales.promedioDiarioCentavos)},`,
    ];

    reply
      .header("Content-Type", "text/csv; charset=utf-8")
      .header(
        "Content-Disposition",
        `attachment; filename="reporte-${anio}-${String(mes).padStart(2, "0")}-${moneda}.csv"`,
      );

    return `\uFEFF${lineas.join("\n")}\n`;
  });
}
