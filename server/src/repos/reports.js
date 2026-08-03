// Cálculo del reporte mensual.
//
// Reproduce exactamente lo que hoy armas a mano en la hoja: el pivot de gastos
// por categoría, el de ingresos, y abajo INGRESOS / GASTOS / TOTAL / PROMEDIO
// DIARIO LIBRE. Todo en centavos enteros y siempre dentro de una sola moneda.

import { diasDelMes, nombreDelMes } from "../domain/dates.js";

const SIN_CATEGORIA = "Sin categoría";

/**
 * Calcula los totales de un mes a partir de los movimientos guardados.
 * No escribe nada: el mismo cálculo sirve para el borrador que se mira en
 * pantalla y para la foto que se congela al cerrar.
 */
export async function calcularTotales(client, { anio, mes, moneda, cuentaId = null }) {
  const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const hasta = mes === 12
    ? `${anio + 1}-01-01`
    : `${anio}-${String(mes + 1).padStart(2, "0")}-01`;
  const filter = { currency: moneda, occurred_on: { $gte: desde, $lt: hasta } };
  if (cuentaId) filter.account_id = cuentaId;

  const rows = await client.collection("movements").aggregate([
    { $match: filter },
    {
      $group: {
        _id: { categoria: { $ifNull: ["$category", SIN_CATEGORIA] }, sentido: "$direction" },
        total: { $sum: "$amount_cents" },
        movimientos: { $sum: 1 },
      },
    },
    { $project: { _id: 0, categoria: "$_id.categoria", sentido: "$_id.sentido", total: 1, movimientos: 1 } },
    { $sort: { categoria: 1 } },
  ]).toArray();

  const gastos = [];
  const ingresos = [];
  let sumaGastos = 0;
  let sumaIngresos = 0;

  for (const fila of rows) {
    const entrada = {
      categoria: fila.categoria,
      centavos: Number(fila.total),
      movimientos: fila.movimientos,
    };

    if (fila.sentido === "gasto") {
      gastos.push(entrada);
      sumaGastos += entrada.centavos;
    } else {
      ingresos.push(entrada);
      sumaIngresos += entrada.centavos;
    }
  }

  // De mayor a menor peso, que es como se lee un pivot.
  gastos.sort((a, b) => a.centavos - b.centavos);
  ingresos.sort((a, b) => b.centavos - a.centavos);

  const total = sumaIngresos + sumaGastos;
  const dias = diasDelMes(anio, mes);

  return {
    periodo: { anio, mes, nombreMes: nombreDelMes(mes), dias },
    moneda,
    gastos,
    ingresos,
    ingresosCentavos: sumaIngresos,
    gastosCentavos: sumaGastos,
    totalCentavos: total,
    // Lo que te queda libre por día: el mismo indicador que ya usas.
    promedioDiarioCentavos: Math.round(total / dias),
    movimientos: rows.reduce((suma, fila) => suma + fila.movimientos, 0),
  };
}

/** Totales del mes anterior, para poder comparar. */
export async function calcularComparativa(client, { anio, mes, moneda, cuentaId }) {
  const mesAnterior = mes === 1 ? 12 : mes - 1;
  const anioAnterior = mes === 1 ? anio - 1 : anio;

  const previo = await calcularTotales(client, {
    anio: anioAnterior,
    mes: mesAnterior,
    moneda,
    cuentaId,
  });

  if (previo.movimientos === 0) return null;

  return {
    periodo: previo.periodo,
    ingresosCentavos: previo.ingresosCentavos,
    gastosCentavos: previo.gastosCentavos,
    totalCentavos: previo.totalCentavos,
  };
}

/** Extractos ligados a ese mes (sin el PDF, solo la ficha). */
export async function extractosDelPeriodo(client, { anio, mes, moneda }) {
  const accounts = await client.collection("accounts").find(
    { currency: moneda },
    { projection: { id: 1, name: 1 } },
  ).toArray();
  const names = new Map(accounts.map((account) => [account.id, account.name]));
  const rows = accounts.length
    ? await client.collection("statements").find({
        account_id: { $in: accounts.map((account) => account.id) },
        period_year: anio,
        period_month: mes,
      }).sort({ uploaded_at: 1 }).toArray()
    : [];

  return rows.map((fila) => ({
    id: fila.id,
    archivo: fila.file_name,
    bytes: fila.byte_size,
    subidoEn: fila.uploaded_at,
    estado: fila.parse_status,
    cuenta: names.get(fila.account_id) ?? null,
  }));
}
