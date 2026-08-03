// Tipo de cambio entre pesos y dólares.
//
// Fuente principal: la TRM oficial que publica el Estado colombiano en Datos
// Abiertos. Es la tasa legalmente válida en Colombia y la que ya aparece en tu
// hoja ("Comisión Spread sobre TRM"), así que es la que cuadra con lo que
// cobran los bancos. Si ese servicio no responde, se recurre a una tasa de
// mercado para no dejar la pantalla sin nada.
//
// Reglas que importan:
//   · Nunca se convierte al guardar. Cada movimiento se queda en su moneda.
//   · Se usa la tasa del DÍA del movimiento, no la de hoy.
//   · Todo lo consultado se guarda, para no depender de que la API esté viva.

import { collection, createUpsertDocument } from "../db/index.js";

const TRM_OFICIAL = "https://www.datos.gov.co/resource/32sa-8pi3.json";
const RESPALDO = "https://open.er-api.com/v6/latest/USD";
const TIEMPO_LIMITE_MS = 8000;

/** Convierte "3144.14" a 3144140000 (millonésimas), sin coma flotante. */
function aMicro(texto) {
  const limpio = String(texto).trim();
  if (!/^\d+(\.\d+)?$/.test(limpio)) return null;

  const [entera, decimal = ""] = limpio.split(".");
  const seisCifras = decimal.slice(0, 6).padEnd(6, "0");
  return Number(BigInt(entera) * 1_000_000n + BigInt(seisCifras));
}

function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

async function pedirJson(url) {
  const respuesta = await fetch(url, {
    signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    headers: { accept: "application/json" },
  });
  if (!respuesta.ok) throw new Error(`${url} respondió ${respuesta.status}`);
  return respuesta.json();
}

/**
 * Trae de la TRM oficial las tasas vigentes en un rango de fechas.
 * Cada registro trae desde y hasta, porque la TRM del viernes rige el fin de
 * semana: hay que expandir el rango, no quedarse con el día suelto.
 */
async function traerTrm(desde, hasta) {
  const consulta = new URLSearchParams({
    $where: `vigenciahasta >= '${desde}T00:00:00.000' and vigenciadesde <= '${hasta}T00:00:00.000'`,
    $order: "vigenciadesde DESC",
    $limit: "400",
  });

  const filas = await pedirJson(`${TRM_OFICIAL}?${consulta}`);
  const porFecha = new Map();

  for (const fila of filas) {
    const micro = aMicro(fila.valor);
    if (!micro) continue;

    const inicio = new Date(`${fila.vigenciadesde.slice(0, 10)}T00:00:00Z`);
    const fin = new Date(`${(fila.vigenciahasta ?? fila.vigenciadesde).slice(0, 10)}T00:00:00Z`);

    for (let d = inicio; d <= fin; d.setUTCDate(d.getUTCDate() + 1)) {
      porFecha.set(d.toISOString().slice(0, 10), micro);
    }
  }

  return porFecha;
}

/** Respaldo: tasa de mercado de hoy. No sirve para fechas pasadas. */
async function traerRespaldo() {
  const datos = await pedirJson(RESPALDO);
  const valor = datos?.rates?.COP;
  if (typeof valor !== "number" || !Number.isFinite(valor)) return null;

  return Math.round(valor * 1_000_000);
}

async function guardar(fecha, micro, fuente) {
  const filter = { fecha, base: "USD", cotizada: "COP" };
  await collection("fx_rates").updateOne(
    filter,
    {
      $set: { tasa_micro: micro, fuente, obtenida: new Date(), updated_at: new Date() },
      $setOnInsert: createUpsertDocument(filter),
    },
    { upsert: true },
  );
}

/**
 * Asegura que estén en la base las tasas de un rango, pidiendo solo lo que
 * falte. Nunca lanza: si no hay red, se trabaja con lo que ya haya guardado.
 */
export async function asegurarRango(desdePedido, hastaPedido, { log } = {}) {
  // La TRM no existe para el futuro. Si se pide un rango que se pasa de hoy,
  // se recorta: para esas fechas se usará la última tasa publicada.
  const hoy = hoyIso();
  const hasta = hastaPedido > hoy ? hoy : hastaPedido;
  const desde = desdePedido > hasta ? hasta : desdePedido;

  const rows = await collection("fx_rates").find(
    { base: "USD", cotizada: "COP", fecha: { $gte: desde, $lte: hasta } },
    { projection: { fecha: 1 } },
  ).toArray();

  const guardadas = new Set(
    rows.map((f) => (typeof f.fecha === "string" ? f.fecha : f.fecha.toISOString()).slice(0, 10)),
  );

  const faltan = [];
  for (let d = new Date(`${desde}T00:00:00Z`); d.toISOString().slice(0, 10) <= hasta; d.setUTCDate(d.getUTCDate() + 1)) {
    const dia = d.toISOString().slice(0, 10);
    // El día de hoy se refresca aunque esté: la TRM puede publicarse tarde.
    if (!guardadas.has(dia) || dia === hoyIso()) faltan.push(dia);
  }

  if (faltan.length === 0) return { pedidas: 0 };

  try {
    const traidas = await traerTrm(desde, hasta);
    for (const [fecha, micro] of traidas) {
      if (fecha >= desde && fecha <= hasta) await guardar(fecha, micro, "trm-oficial");
    }
    return { pedidas: traidas.size };
  } catch (error) {
    log?.warn?.({ err: error }, "no se pudo consultar la TRM oficial");
  }

  // El respaldo solo sabe de hoy; sirve para que la pantalla no quede vacía.
  try {
    const micro = await traerRespaldo();
    if (micro) {
      await guardar(hoyIso(), micro, "mercado-respaldo");
      return { pedidas: 1 };
    }
  } catch (error) {
    log?.warn?.({ err: error }, "tampoco respondió la fuente de respaldo");
  }

  return { pedidas: 0 };
}

/**
 * Tasa aplicable a una fecha. Si ese día no tiene (festivo, fin de semana o
 * futuro), se usa la última anterior: es lo que hacen los bancos.
 */
export async function tasaParaFecha(fecha) {
  const fila = await collection("fx_rates").findOne(
    { base: "USD", cotizada: "COP", fecha: { $lte: fecha } },
    { sort: { fecha: -1 }, projection: { fecha: 1, tasa_micro: 1, fuente: 1 } },
  );

  if (!fila) return null;

  return {
    fecha: (typeof fila.fecha === "string" ? fila.fecha : fila.fecha.toISOString()).slice(0, 10),
    tasaMicro: Number(fila.tasa_micro),
    fuente: fila.fuente,
    // Se avisa cuando la tasa no es del día pedido, para no dar por exacto algo
    // que es una aproximación.
    exacta: (typeof fila.fecha === "string" ? fila.fecha : fila.fecha.toISOString()).slice(0, 10) === fecha,
  };
}

/** Todas las tasas de un rango, listas para convertir una lista de movimientos. */
export async function tasasDelRango(desde, hasta) {
  const rows = await collection("fx_rates").find(
    { base: "USD", cotizada: "COP", fecha: { $gte: desde, $lte: hasta } },
    { projection: { fecha: 1, tasa_micro: 1 } },
  ).sort({ fecha: 1 }).toArray();

  return new Map(
    rows.map((f) => [
      (typeof f.fecha === "string" ? f.fecha : f.fecha.toISOString()).slice(0, 10),
      Number(f.tasa_micro),
    ]),
  );
}

/**
 * Convierte centavos de una moneda a la otra con una tasa dada.
 * Aritmética entera de principio a fin: nada de coma flotante con dinero.
 */
export function convertirCentavos(centavos, tasaMicro, { de, a }) {
  if (de === a) return centavos;
  if (!tasaMicro) return null;

  const valor = BigInt(centavos);
  const tasa = BigInt(tasaMicro);

  // Redondeo al centavo más cercano, respetando el signo.
  const redondear = (numerador, denominador) => {
    const negativo = numerador < 0n;
    const abs = negativo ? -numerador : numerador;
    const resultado = (abs * 2n + denominador) / (denominador * 2n);
    return Number(negativo ? -resultado : resultado);
  };

  if (de === "USD" && a === "COP") return redondear(valor * tasa, 1_000_000n);
  if (de === "COP" && a === "USD") return redondear(valor * 1_000_000n, tasa);

  return null;
}
