// Presupuesto fijo recurrente con estado independiente por periodo.

import { audit } from "../audit.js";
import { collection, createDocument, createUpsertDocument, transaction } from "../db/index.js";
import { badRequest, notFound } from "../http/errors.js";
import { requireRole } from "../auth/guard.js";
import { normalizarPeriodo } from "../domain/dates.js";
import { parseAmountToCents } from "../domain/money.js";

const FRECUENCIAS = new Set(["mensual", "bimestral", "trimestral", "semestral", "anual"]);
const TIPOS = new Set(["ingreso", "gasto"]);
const MODOS = new Set(["automatico", "manual"]);
const ESTADOS = new Set(["pendiente", "pagado", "omitido"]);
const MONEDAS = new Set(["COP", "USD"]);
const MESES_POR_FRECUENCIA = { mensual: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12 };

function conceptoPublico(fila) {
  return {
    id: fila.id,
    concepto: fila.concept,
    dia: fila.day_of_month,
    centavos: Number(fila.amount_cents),
    moneda: fila.currency,
    frecuencia: fila.frequency,
    tipo: fila.kind,
    pago: fila.payment_mode,
    notas: fila.notes,
    activo: fila.active,
    estadoDelMes: fila.estado ?? undefined,
    centavosDelMes: fila.centavos_mes === null || fila.centavos_mes === undefined
      ? undefined
      : Number(fila.centavos_mes),
    pagadoEl: fila.paid_on ?? undefined,
  };
}

function tocaEsteMes(fila, anio, mes) {
  const paso = MESES_POR_FRECUENCIA[fila.frequency] ?? 1;
  if (paso === 1) return true;
  const alta = new Date(fila.created_at);
  const mesesDesdeElAlta = (anio - alta.getUTCFullYear()) * 12 + (mes - (alta.getUTCMonth() + 1));
  return mesesDesdeElAlta >= 0 && mesesDesdeElAlta % paso === 0;
}

function validarConcepto(cuerpo, { parcial = false } = {}) {
  const problemas = [];
  const exigido = (valor) => !parcial || valor !== undefined;
  if (exigido(cuerpo.concepto) && !String(cuerpo.concepto ?? "").trim()) problemas.push("Falta el concepto.");
  if (exigido(cuerpo.importe)) {
    const centavos = parseAmountToCents(cuerpo.importe);
    if (centavos === null || centavos <= 0) problemas.push("El importe debe ser un número positivo (el sentido lo da el tipo).");
  }
  if (exigido(cuerpo.frecuencia) && !FRECUENCIAS.has(cuerpo.frecuencia)) problemas.push("La frecuencia no es válida.");
  if (exigido(cuerpo.tipo) && !TIPOS.has(cuerpo.tipo)) problemas.push("El tipo debe ser ingreso o gasto.");
  if (exigido(cuerpo.pago) && !MODOS.has(cuerpo.pago)) problemas.push("El pago debe ser automatico o manual.");
  if (cuerpo.moneda !== undefined && !MONEDAS.has(String(cuerpo.moneda).toUpperCase())) problemas.push("La moneda debe ser COP o USD.");
  if (cuerpo.dia !== undefined && cuerpo.dia !== null) {
    const dia = Number(cuerpo.dia);
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) problemas.push("El día debe estar entre 1 y 31.");
  }
  return problemas;
}

export default async function budgetRoutes(app) {
  const items = collection("budget_items");

  app.get("/api/presupuesto", async (request) => {
    const periodo = normalizarPeriodo(request.query?.anio, request.query?.mes);

    // Los conceptos retirados se ocultan por defecto, pero hay que poder verlos
    // para reactivarlos: si no, desactivar uno equivaldría a perderlo.
    const incluirRetirados = request.query?.retirados === "1";
    const filtro = incluirRetirados ? {} : { active: true };

    const rows = await items.find(filtro).sort({ day_of_month: 1, concept: 1 }).toArray();
    if (!periodo) return { conceptos: rows.map(conceptoPublico) };

    const ids = rows.map((row) => row.id);
    const estados = ids.length
      ? await collection("budget_periods").find({
          budget_item_id: { $in: ids },
          period_year: periodo.anio,
          period_month: periodo.mes,
        }).toArray()
      : [];
    const porId = new Map(estados.map((row) => [row.budget_item_id, row]));
    const delMes = rows
      .filter((row) => row.active && tocaEsteMes(row, periodo.anio, periodo.mes))
      .map((row) => {
        const estado = porId.get(row.id);
        return {
          ...row,
          estado: estado?.status ?? "pendiente",
          centavos_mes: estado?.amount_cents ?? null,
          paid_on: estado?.paid_on ?? null,
        };
      });

    const suma = (tipo) => delMes.filter((row) => row.kind === tipo)
      .reduce((total, row) => total + Number(row.centavos_mes ?? row.amount_cents), 0);
    const pendientes = delMes.filter((row) => row.estado === "pendiente");

    const retirados = incluirRetirados ? rows.filter((row) => !row.active) : [];

    return {
      periodo,
      conceptos: delMes.map(conceptoPublico),
      // Van aparte para que no se mezclen con el plan del mes en curso.
      retirados: retirados.map(conceptoPublico),
      resumen: {
        gastosPlaneados: suma("gasto"),
        ingresosPlaneados: suma("ingreso"),
        pendientes: pendientes.length,
        pendientesCentavos: pendientes.filter((row) => row.kind === "gasto")
          .reduce((total, row) => total + Number(row.centavos_mes ?? row.amount_cents), 0),
      },
    };
  });

  app.post("/api/presupuesto", async (request) => {
    const cuerpo = request.body ?? {};
    const problemas = validarConcepto(cuerpo);
    if (problemas.length) throw badRequest(problemas.join(" "));

    const item = createDocument({
      concept: String(cuerpo.concepto).trim(),
      day_of_month: cuerpo.dia ?? null,
      amount_cents: parseAmountToCents(cuerpo.importe),
      currency: String(cuerpo.moneda ?? "COP").toUpperCase(),
      frequency: cuerpo.frecuencia,
      kind: cuerpo.tipo,
      payment_mode: cuerpo.pago,
      notes: cuerpo.notas ?? null,
      active: true,
    });
    await items.insertOne(item);
    await audit(request, { action: "presupuesto.creado", entity: "budget_item", entityId: item.id, meta: { concepto: cuerpo.concepto } });
    return { concepto: conceptoPublico(item) };
  });

  app.patch("/api/presupuesto/:id", async (request) => {
    const cuerpo = request.body ?? {};
    const problemas = validarConcepto(cuerpo, { parcial: true });
    if (problemas.length) throw badRequest(problemas.join(" "));
    const item = await items.findOne({ id: request.params.id });
    if (!item) throw notFound("Ese concepto no existe.");

    const cambios = { updated_at: new Date() };
    if (cuerpo.concepto !== undefined) cambios.concept = String(cuerpo.concepto).trim();
    // Se acepta null para quitar el día: hay conceptos que dejan de tener fecha
    // fija y antes no había manera de borrársela.
    if (cuerpo.dia !== undefined) cambios.day_of_month = cuerpo.dia === null || cuerpo.dia === "" ? null : cuerpo.dia;
    if (cuerpo.importe !== undefined) cambios.amount_cents = parseAmountToCents(cuerpo.importe);
    if (cuerpo.frecuencia !== undefined) cambios.frequency = cuerpo.frecuencia;
    if (cuerpo.tipo !== undefined) cambios.kind = cuerpo.tipo;
    if (cuerpo.pago !== undefined) cambios.payment_mode = cuerpo.pago;
    if (cuerpo.notas !== undefined) cambios.notes = String(cuerpo.notas) || null;
    if (cuerpo.activo !== undefined) cambios.active = Boolean(cuerpo.activo);

    const updated = await items.findOneAndUpdate({ id: item.id }, { $set: cambios }, { returnDocument: "after" });
    await audit(request, {
      action: "presupuesto.actualizado",
      entity: "budget_item",
      entityId: item.id,
      // Se guarda qué cambió: son dos personas tocando el mismo plan.
      meta: {
        concepto: updated.concept,
        campos: Object.keys(cambios).filter((campo) => campo !== "updated_at"),
        antes: { concepto: item.concept, importe: item.amount_cents, activo: item.active },
      },
    });
    return { concepto: conceptoPublico(updated) };
  });

  app.put("/api/presupuesto/:id/:anio/:mes", async (request) => {
    const periodo = normalizarPeriodo(request.params.anio, request.params.mes);
    if (!periodo) throw badRequest("El año o el mes no son válidos.");
    const { estado = "pagado", importe, pagadoEl, notas } = request.body ?? {};
    if (!ESTADOS.has(estado)) throw badRequest("El estado debe ser pendiente, pagado u omitido.");
    const item = await items.findOne({ id: request.params.id });
    if (!item) throw notFound("Ese concepto no existe.");

    const centavos = importe === undefined || importe === null || importe === "" ? null : parseAmountToCents(importe);
    if (importe !== undefined && importe !== null && importe !== "" && (centavos === null || centavos <= 0)) {
      throw badRequest("El importe real no es válido.");
    }

    const periods = collection("budget_periods");
    const filter = { budget_item_id: item.id, period_year: periodo.anio, period_month: periodo.mes };
    const now = new Date();
    const period = await periods.findOneAndUpdate(
      filter,
      {
        $set: {
          status: estado,
          amount_cents: centavos,
          paid_on: estado === "pagado" ? (pagadoEl ?? now.toISOString().slice(0, 10)) : null,
          notes: notas ?? null,
          updated_by: request.user.id,
          updated_at: now,
        },
        $setOnInsert: createUpsertDocument(filter),
      },
      { upsert: true, returnDocument: "after" },
    );

    await audit(request, {
      action: "presupuesto.estado",
      entity: "budget_item",
      entityId: item.id,
      meta: { ...periodo, estado, concepto: item.concept },
    });
    return { estado: period.status, pagadoEl: period.paid_on, centavos: period.amount_cents };
  });

  app.delete("/api/presupuesto/:id", { preHandler: requireRole("owner") }, async (request) => {
    const item = await items.findOne({ id: request.params.id });
    if (!item) throw notFound("Ese concepto no existe.");
    await transaction(async (db) => {
      await db.collection("budget_periods").deleteMany({ budget_item_id: item.id });
      await db.collection("budget_items").deleteOne({ id: item.id });
    });
    await audit(request, { action: "presupuesto.borrado", entity: "budget_item", entityId: item.id, meta: { concepto: item.concept } });
    return { ok: true };
  });
}
