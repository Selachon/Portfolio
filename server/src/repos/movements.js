// Alta de movimientos: el único camino por el que entran filas a la contabilidad.
//
// Lo usan igual el alta manual, el pegado de una tabla y (más adelante) el
// parser de extractos, para que la deduplicación y la clasificación se apliquen
// siempre, venga de donde venga el dato.

import { clasificar } from "../domain/categories.js";
import { createDocument } from "../db/index.js";
import {
  calcularBaseDuplicado,
  claveDuplicado,
  direccionDe,
  validarMovimiento,
} from "../domain/movements.js";

/** Carga las reglas de categoría activas, ya ordenadas por prioridad. */
export async function cargarReglas(client) {
  return client.collection("category_rules").find({ active: true }).sort({ priority: 1, id: 1 }).toArray();
}

/**
 * Revisa un lote sin escribir nada: dice qué entraría, qué parece repetido y
 * qué está mal. Es lo que alimenta la pantalla de revisión antes de confirmar.
 *
 * `candidatos`: [{ occurredOn, description, amountCents, category?, notes? }]
 */
export async function analizarLote(client, { accountId, candidatos, reglas }) {
  const vistosEnElLote = new Map();
  const resultado = [];

  for (const [indice, candidato] of candidatos.entries()) {
    const problemas = validarMovimiento(candidato);

    if (problemas.length > 0) {
      resultado.push({ indice, estado: "invalido", problemas, candidato });
      continue;
    }

    const base = calcularBaseDuplicado({ accountId, ...candidato });

    const enLaBase = await client.collection("movements").countDocuments({ account_id: accountId, dedupe_base: base });
    const enElLote = vistosEnElLote.get(base) ?? 0;
    const ordinal = enLaBase + enElLote;

    vistosEnElLote.set(base, enElLote + 1);

    const direccion = direccionDe(candidato.amountCents);
    resultado.push({
      indice,
      estado: ordinal > 0 ? "duplicado" : "nuevo",
      base,
      ordinal,
      candidato: {
        ...candidato,
        direction: direccion,
        category: candidato.category ?? clasificar(candidato.description, direccion, reglas),
      },
      // Cuántas copias había ya: le dice a quien revisa si es un repetido real.
      copiasPrevias: enLaBase,
    });
  }

  return resultado;
}

/**
 * Inserta un lote ya revisado.
 *
 * `duplicados`: "omitir" (por defecto) deja fuera las filas que ya existían;
 * "insertar" las mete igual, para el caso legítimo de dos cobros idénticos.
 */
export async function insertarLote(
  client,
  { accountId, currency, candidatos, source, statementId = null, userId = null, reglas, duplicados = "omitir" },
) {
  const analisis = await analizarLote(client, { accountId, candidatos, reglas });

  const insertados = [];
  const omitidos = [];
  const invalidos = [];

  for (const fila of analisis) {
    if (fila.estado === "invalido") {
      invalidos.push(fila);
      continue;
    }
    if (fila.estado === "duplicado" && duplicados === "omitir") {
      omitidos.push(fila);
      continue;
    }

    const { candidato } = fila;
    const movement = createDocument({
      account_id: accountId,
      currency,
      statement_id: statementId,
      occurred_on: candidato.occurredOn,
      description: candidato.description.trim(),
      amount_cents: candidato.amountCents,
      direction: candidato.direction,
      category: candidato.category ?? null,
      notes: candidato.notes ?? null,
      source,
      dedupe_base: fila.base,
      dedupe_key: claveDuplicado(fila.base, fila.ordinal),
      created_by: userId,
    });

    try {
      await client.collection("movements").insertOne(movement);
      insertados.push({ id: movement.id, ...candidato });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      omitidos.push(fila);
    }
  }

  return { insertados, omitidos, invalidos };
}
