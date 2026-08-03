// Registro de auditoría.
//
// Son dos personas moviendo el mismo dinero, así que toda escritura deja rastro
// de quién la hizo y cuándo. Nunca hace fallar la petición: si la auditoría
// falla, se anota en el log y la operación sigue.

import { collection, createDocument } from "./db/index.js";

export async function audit(request, { action, entity, entityId = null, meta = {} }) {
  try {
    await collection("audit_log").insertOne(
      createDocument({
        user_id: request?.user?.id ?? null,
        action,
        entity,
        entity_id: entityId === null ? null : String(entityId),
        meta,
        ip: request?.ip ?? null,
        at: new Date(),
      }),
    );
  } catch (error) {
    request?.log?.error({ err: error, action, entity }, "no se pudo escribir la auditoría");
  }
}
