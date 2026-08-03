// Deudas en cuotas y cantidades pendientes de cobro.

import { audit } from "../audit.js";
import { collection, createDocument } from "../db/index.js";
import { badRequest, notFound } from "../http/errors.js";
import { requireRole } from "../auth/guard.js";
import { parseAmountToCents } from "../domain/money.js";

const ESTADOS_COBRO = new Set(["pendiente", "cobrado", "perdonado"]);
const MONEDAS = new Set(["COP", "USD"]);

function saldo(principal, total, pagadas) {
  return Math.trunc((principal * (total - pagadas)) / total);
}

function deudaPublica(fila) {
  return {
    id: fila.id,
    concepto: fila.concept,
    centavos: Number(fila.principal_cents),
    moneda: fila.currency,
    dia: fila.day_of_month,
    cuotas: fila.installments_total,
    pagadas: fila.installments_paid,
    pendientes: fila.installments_total - fila.installments_paid,
    restanteCentavos: Number(fila.remaining_cents),
    notas: fila.notes,
    activa: fila.active,
  };
}

function deudorPublico(fila) {
  return {
    id: fila.id,
    deudor: fila.debtor,
    centavos: Number(fila.amount_cents),
    moneda: fila.currency,
    dia: fila.day_of_month,
    notas: fila.notes,
    estado: fila.status,
  };
}

function validarDia(dia) {
  if (dia === undefined || dia === null || dia === "") return null;
  const value = Number(dia);
  return Number.isInteger(value) && value >= 1 && value <= 31 ? value : undefined;
}

export default async function debtRoutes(app) {
  const debts = collection("debts");
  const receivables = collection("receivables");

  app.get("/api/deudas", async () => {
    const rows = await debts.find({}).sort({ active: -1, concept: 1 }).toArray();
    const activas = rows.filter((row) => row.active);
    return {
      deudas: rows.map(deudaPublica),
      resumen: {
        restanteCentavos: activas.reduce((total, row) => total + Number(row.remaining_cents), 0),
        cuotasPendientes: activas.reduce((total, row) => total + row.installments_total - row.installments_paid, 0),
      },
    };
  });

  app.post("/api/deudas", async (request) => {
    const { concepto, importe, moneda = "COP", dia, cuotas, pagadas = 0, notas } = request.body ?? {};
    const centavos = parseAmountToCents(importe);
    const total = Number.parseInt(cuotas, 10);
    const yaPagadas = Number.parseInt(pagadas, 10) || 0;
    const currency = String(moneda).toUpperCase();
    const day = validarDia(dia);

    if (!String(concepto ?? "").trim()) throw badRequest("Falta el concepto de la deuda.");
    if (centavos === null || centavos <= 0) throw badRequest("El importe debe ser positivo.");
    if (!MONEDAS.has(currency)) throw badRequest("La moneda debe ser COP o USD.");
    if (day === undefined) throw badRequest("El día debe estar entre 1 y 31.");
    if (!Number.isInteger(total) || total < 1) throw badRequest("Las cuotas deben ser al menos una.");
    if (yaPagadas < 0 || yaPagadas > total) throw badRequest("Las cuotas pagadas no pueden superar el total.");

    const debt = createDocument({
      concept: String(concepto).trim(),
      principal_cents: centavos,
      currency,
      day_of_month: day,
      installments_total: total,
      installments_paid: yaPagadas,
      remaining_cents: saldo(centavos, total, yaPagadas),
      notes: notas ?? null,
      active: true,
    });
    await debts.insertOne(debt);
    await audit(request, { action: "deuda.creada", entity: "debt", entityId: debt.id, meta: { concepto } });
    return { deuda: deudaPublica(debt) };
  });

  app.patch("/api/deudas/:id", async (request) => {
    const { concepto, importe, dia, cuotas, pagadas, notas, activa } = request.body ?? {};
    const debt = await debts.findOne({ id: request.params.id });
    if (!debt) throw notFound("Esa deuda no existe.");

    const total = cuotas === undefined ? debt.installments_total : Number.parseInt(cuotas, 10);
    const yaPagadas = pagadas === undefined ? debt.installments_paid : Number.parseInt(pagadas, 10);
    const centavos = importe === undefined ? debt.principal_cents : parseAmountToCents(importe);
    const day = dia === undefined ? debt.day_of_month : validarDia(dia);
    if (!Number.isInteger(total) || total < 1) throw badRequest("Las cuotas deben ser al menos una.");
    if (!Number.isInteger(yaPagadas) || yaPagadas < 0 || yaPagadas > total) throw badRequest("Las cuotas pagadas no pueden superar el total.");
    if (centavos === null || centavos <= 0) throw badRequest("El importe debe ser positivo.");
    if (day === undefined) throw badRequest("El día debe estar entre 1 y 31.");

    const cambios = {
      installments_total: total,
      installments_paid: yaPagadas,
      principal_cents: centavos,
      remaining_cents: saldo(centavos, total, yaPagadas),
      updated_at: new Date(),
    };
    if (concepto !== undefined) cambios.concept = String(concepto).trim();
    if (dia !== undefined) cambios.day_of_month = day;
    if (notas !== undefined) cambios.notes = String(notas) || null;
    if (activa !== undefined) cambios.active = Boolean(activa);

    const updated = await debts.findOneAndUpdate({ id: debt.id }, { $set: cambios }, { returnDocument: "after" });
    await audit(request, { action: "deuda.actualizada", entity: "debt", entityId: debt.id, meta: { pagadas: yaPagadas, cuotas: total } });
    return { deuda: deudaPublica(updated) };
  });

  app.post("/api/deudas/:id/cuota", async (request) => {
    const debt = await debts.findOne({ id: request.params.id });
    if (!debt) throw notFound("Esa deuda no existe.");
    if (debt.installments_paid >= debt.installments_total) throw badRequest("Esa deuda ya está saldada.");
    const pagadas = debt.installments_paid + 1;
    const updated = await debts.findOneAndUpdate(
      { id: debt.id, installments_paid: debt.installments_paid },
      { $set: { installments_paid: pagadas, remaining_cents: saldo(debt.principal_cents, debt.installments_total, pagadas), updated_at: new Date() } },
      { returnDocument: "after" },
    );
    if (!updated) throw badRequest("La deuda cambió mientras registrabas la cuota. Inténtalo otra vez.");
    await audit(request, { action: "deuda.cuota-pagada", entity: "debt", entityId: debt.id, meta: { concepto: debt.concept, pagadas } });
    return { deuda: deudaPublica(updated) };
  });

  app.delete("/api/deudas/:id", { preHandler: requireRole("owner") }, async (request) => {
    const debt = await debts.findOne({ id: request.params.id });
    if (!debt) throw notFound("Esa deuda no existe.");
    await debts.deleteOne({ id: debt.id });
    await audit(request, { action: "deuda.borrada", entity: "debt", entityId: debt.id, meta: { concepto: debt.concept } });
    return { ok: true };
  });

  app.get("/api/deudores", async () => {
    const rows = await receivables.find({}).sort({ status: 1, debtor: 1 }).toArray();
    rows.sort((a, b) => (a.status === "pendiente" ? -1 : 1) - (b.status === "pendiente" ? -1 : 1) || a.debtor.localeCompare(b.debtor));
    return {
      deudores: rows.map(deudorPublico),
      resumen: {
        pendienteCentavos: rows.filter((row) => row.status === "pendiente").reduce((total, row) => total + Number(row.amount_cents), 0),
      },
    };
  });

  app.post("/api/deudores", async (request) => {
    const { deudor, importe, moneda = "COP", dia, notas } = request.body ?? {};
    const centavos = parseAmountToCents(importe);
    const currency = String(moneda).toUpperCase();
    const day = validarDia(dia);
    if (!String(deudor ?? "").trim()) throw badRequest("Falta el nombre de quien debe.");
    if (centavos === null || centavos <= 0) throw badRequest("El importe debe ser positivo.");
    if (!MONEDAS.has(currency)) throw badRequest("La moneda debe ser COP o USD.");
    if (day === undefined) throw badRequest("El día debe estar entre 1 y 31.");

    const receivable = createDocument({
      debtor: String(deudor).trim(), amount_cents: centavos, currency,
      day_of_month: day, notes: notas ?? null, status: "pendiente",
    });
    await receivables.insertOne(receivable);
    await audit(request, { action: "deudor.creado", entity: "receivable", entityId: receivable.id, meta: { deudor } });
    return { deudor: deudorPublico(receivable) };
  });

  app.patch("/api/deudores/:id", async (request) => {
    const { deudor, importe, dia, notas, estado } = request.body ?? {};
    const row = await receivables.findOne({ id: request.params.id });
    if (!row) throw notFound("Ese registro no existe.");
    if (estado !== undefined && !ESTADOS_COBRO.has(estado)) throw badRequest("El estado debe ser pendiente, cobrado o perdonado.");
    const centavos = importe === undefined ? row.amount_cents : parseAmountToCents(importe);
    const day = dia === undefined ? row.day_of_month : validarDia(dia);
    if (centavos === null || centavos <= 0) throw badRequest("El importe debe ser positivo.");
    if (day === undefined) throw badRequest("El día debe estar entre 1 y 31.");

    const cambios = { amount_cents: centavos, updated_at: new Date() };
    if (deudor !== undefined) cambios.debtor = String(deudor).trim();
    if (dia !== undefined) cambios.day_of_month = day;
    if (notas !== undefined) cambios.notes = String(notas) || null;
    if (estado !== undefined) cambios.status = estado;
    const updated = await receivables.findOneAndUpdate({ id: row.id }, { $set: cambios }, { returnDocument: "after" });
    await audit(request, { action: "deudor.actualizado", entity: "receivable", entityId: row.id, meta: { estado } });
    return { deudor: deudorPublico(updated) };
  });

  app.delete("/api/deudores/:id", { preHandler: requireRole("owner") }, async (request) => {
    const row = await receivables.findOne({ id: request.params.id });
    if (!row) throw notFound("Ese registro no existe.");
    await receivables.deleteOne({ id: row.id });
    await audit(request, { action: "deudor.borrado", entity: "receivable", entityId: row.id, meta: { deudor: row.debtor } });
    return { ok: true };
  });
}
