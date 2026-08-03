// Cuentas: los orígenes de dinero. Cada una tiene su moneda y no se mezclan.

import { audit } from "../audit.js";
import { collection, createDocument } from "../db/index.js";
import { badRequest, conflict, notFound } from "../http/errors.js";
import { requireRole } from "../auth/guard.js";

const TIPOS = new Set(["banco", "tarjeta", "cripto", "efectivo"]);
const MONEDAS = new Set(["COP", "USD"]);

function cuentaPublica(fila) {
  return {
    id: fila.id,
    nombre: fila.name,
    tipo: fila.kind,
    moneda: fila.currency,
    perfilExtracto: fila.parser_profile,
    activa: fila.active,
    movimientos: fila.movimientos === undefined ? undefined : Number(fila.movimientos),
  };
}

export default async function accountRoutes(app) {
  const accounts = collection("accounts");

  app.get("/api/cuentas", async () => {
    const rows = await accounts.find({}).sort({ active: -1, name: 1 }).toArray();
    const counts = await collection("movements")
      .aggregate([{ $group: { _id: "$account_id", movimientos: { $sum: 1 } } }])
      .toArray();
    const porCuenta = new Map(counts.map((row) => [row._id, row.movimientos]));
    return {
      cuentas: rows.map((row) => cuentaPublica({ ...row, movimientos: porCuenta.get(row.id) ?? 0 })),
    };
  });

  app.post("/api/cuentas", async (request) => {
    const { nombre, tipo, moneda, perfilExtracto } = request.body ?? {};
    const name = typeof nombre === "string" ? nombre.trim() : "";
    if (name.length < 2) throw badRequest("La cuenta necesita un nombre.");
    if (!TIPOS.has(tipo)) throw badRequest("El tipo debe ser banco, tarjeta, cripto o efectivo.");
    if (!MONEDAS.has(moneda)) throw badRequest("La moneda debe ser COP o USD.");

    const existente = await accounts.findOne({ name }, { collation: { locale: "es", strength: 2 } });
    if (existente) throw conflict("Ya tienes una cuenta con ese nombre.");

    const account = createDocument({
      name,
      kind: tipo,
      currency: moneda,
      parser_profile: perfilExtracto ?? null,
      active: true,
    });
    await accounts.insertOne(account);
    await audit(request, { action: "cuenta.creada", entity: "account", entityId: account.id, meta: { name, moneda } });
    return { cuenta: cuentaPublica(account) };
  });

  app.patch("/api/cuentas/:id", async (request) => {
    const { nombre, activa, perfilExtracto } = request.body ?? {};
    const account = await accounts.findOne({ id: request.params.id });
    if (!account) throw notFound("Esa cuenta no existe.");

    const cambios = { updated_at: new Date() };
    if (typeof nombre === "string" && nombre.trim()) cambios.name = nombre.trim();
    if (activa !== undefined) cambios.active = Boolean(activa);
    if (typeof perfilExtracto === "string") cambios.parser_profile = perfilExtracto;

    if (cambios.name) {
      const duplicate = await accounts.findOne(
        { name: cambios.name, id: { $ne: account.id } },
        { collation: { locale: "es", strength: 2 } },
      );
      if (duplicate) throw conflict("Ya tienes una cuenta con ese nombre.");
    }

    const updated = await accounts.findOneAndUpdate(
      { id: account.id },
      { $set: cambios },
      { returnDocument: "after" },
    );
    await audit(request, { action: "cuenta.actualizada", entity: "account", entityId: account.id });
    return { cuenta: cuentaPublica(updated) };
  });

  app.delete("/api/cuentas/:id", { preHandler: requireRole("owner") }, async (request) => {
    const account = await accounts.findOne({ id: request.params.id });
    if (!account) throw notFound("Esa cuenta no existe.");
    if (await collection("movements").findOne({ account_id: account.id })) {
      throw conflict(
        "Esa cuenta tiene movimientos registrados. Desactívala en vez de borrarla para no perder el historial.",
      );
    }
    if (await collection("statements").findOne({ account_id: account.id })) {
      throw conflict("Esa cuenta tiene extractos guardados. Desactívala para conservar los respaldos.");
    }
    await accounts.deleteOne({ id: account.id });
    await audit(request, { action: "cuenta.borrada", entity: "account", entityId: account.id, meta: { nombre: account.name } });
    return { ok: true };
  });
}
