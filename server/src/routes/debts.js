// Deudas propias: por cuotas pactadas o de abono libre.

import { audit } from "../audit.js";
import { collection, createDocument } from "../db/index.js";
import { badRequest, conflict, notFound } from "../http/errors.js";
import { requireRole } from "../auth/guard.js";
import { parseAmountToCents } from "../domain/money.js";
import { TIPOS, saldoPendiente, validarDia } from "../domain/saldos.js";
import {
  DEUDAS,
  abonoPublico,
  deshacerAbono,
  estadoSaldo,
  fechaDeAbono,
  registrarAbono,
  resumir,
} from "../repos/saldos.js";

const MONEDAS = new Set(["COP", "USD"]);

function deudaPublica(fila, abonos) {
  const calculado = resumir(DEUDAS, fila);

  return {
    id: fila.id,
    concepto: fila.concept,
    tipo: fila.kind,
    centavos: calculado.principalCents,
    abonadoCentavos: calculado.paidCents,
    restanteCentavos: calculado.restanteCentavos,
    porcentaje: calculado.porcentaje,
    saldada: calculado.saldada,
    moneda: fila.currency,
    dia: fila.day_of_month,
    // Solo tienen sentido en las deudas por cuotas.
    cuotas: fila.kind === "cuotas" ? fila.installments_total : null,
    pagadas: fila.kind === "cuotas" ? fila.installments_paid : null,
    pendientes: fila.kind === "cuotas" ? fila.installments_total - fila.installments_paid : null,
    cuotaSugeridaCentavos: calculado.cuotaSugeridaCentavos,
    notas: fila.notes,
    activa: fila.active,
    saldadaEn: fila.settled_at ?? null,
    abonos: abonos?.map(abonoPublico),
  };
}

export default async function debtRoutes(app) {
  const debts = collection("debts");
  const debtPayments = collection("debt_payments");

  app.get("/api/deudas", async () => {
    const rows = await debts.find({}).sort({ active: -1, concept: 1 }).toArray();
    const activas = rows.filter((row) => row.active);
    const porCuotas = activas.filter((row) => row.kind === "cuotas");

    return {
      deudas: rows.map((row) => deudaPublica(row)),
      resumen: {
        restanteCentavos: activas.reduce((total, row) => total + resumir(DEUDAS, row).restanteCentavos, 0),
        capitalCentavos: activas.reduce((total, row) => total + Number(row.principal_cents), 0),
        abonadoCentavos: activas.reduce((total, row) => total + Number(row.paid_cents ?? 0), 0),
        cuotasPendientes: porCuotas.reduce(
          (total, row) => total + row.installments_total - row.installments_paid,
          0,
        ),
        activas: activas.length,
        saldadas: rows.filter((row) => resumir(DEUDAS, row).saldada).length,
      },
    };
  });

  /** Una deuda con todo su historial de abonos. */
  app.get("/api/deudas/:id", async (request) => {
    const debt = await debts.findOne({ id: request.params.id });
    if (!debt) throw notFound("Esa deuda no existe.");

    const abonos = await debtPayments
      .find({ debt_id: debt.id })
      .sort({ paid_on: -1, created_at: -1 })
      .toArray();

    return { deuda: deudaPublica(debt, abonos) };
  });

  app.post("/api/deudas", async (request) => {
    const {
      concepto,
      importe,
      moneda = "COP",
      dia,
      tipo = "cuotas",
      cuotas,
      pagadas = 0,
      abonado,
      notas,
    } = request.body ?? {};

    const centavos = parseAmountToCents(importe);
    const currency = String(moneda).toUpperCase();
    const day = validarDia(dia);

    if (!String(concepto ?? "").trim()) throw badRequest("Falta el concepto de la deuda.");
    if (centavos === null || centavos <= 0) throw badRequest("El importe debe ser positivo.");
    if (!MONEDAS.has(currency)) throw badRequest("La moneda debe ser COP o USD.");
    if (day === undefined) throw badRequest("El día debe estar entre 1 y 31.");
    if (!TIPOS.has(tipo)) throw badRequest("El tipo debe ser 'cuotas' o 'libre'.");

    let total = 1;
    let yaPagadas = 0;
    let paidCents;

    if (tipo === "cuotas") {
      total = Number.parseInt(cuotas, 10);
      yaPagadas = Number.parseInt(pagadas, 10) || 0;
      if (!Number.isInteger(total) || total < 1) throw badRequest("Las cuotas deben ser al menos una.");
      if (yaPagadas < 0 || yaPagadas > total) {
        throw badRequest("Las cuotas pagadas no pueden superar el total.");
      }
      // Lo ya pagado antes de usar el portal se deduce de las cuotas cubiertas,
      // salvo que se indique un importe concreto.
      paidCents =
        abonado === undefined || abonado === null || abonado === ""
          ? Math.trunc((centavos * yaPagadas) / total)
          : parseAmountToCents(abonado);
    } else {
      paidCents =
        abonado === undefined || abonado === null || abonado === "" ? 0 : parseAmountToCents(abonado);
    }

    if (paidCents === null || paidCents < 0) throw badRequest("Lo abonado debe ser un importe positivo.");
    if (paidCents > centavos) throw badRequest("Lo abonado no puede superar el capital de la deuda.");

    const restante = saldoPendiente({ principalCents: centavos, paidCents });
    const debt = createDocument({
      concept: String(concepto).trim(),
      kind: tipo,
      principal_cents: centavos,
      currency,
      day_of_month: day,
      installments_total: total,
      installments_paid: yaPagadas,
      paid_cents: paidCents,
      remaining_cents: restante,
      settled_at: restante === 0 ? new Date() : null,
      notes: notas ?? null,
      active: true,
    });

    await debts.insertOne(debt);
    await audit(request, {
      action: "deuda.creada",
      entity: "debt",
      entityId: debt.id,
      meta: { concepto, tipo, capital: centavos, abonado: paidCents },
    });

    return { deuda: deudaPublica(debt, []) };
  });

  app.patch("/api/deudas/:id", async (request) => {
    const { concepto, importe, dia, tipo, cuotas, pagadas, abonado, notas, activa } = request.body ?? {};
    const debt = await debts.findOne({ id: request.params.id });
    if (!debt) throw notFound("Esa deuda no existe.");

    const kind = tipo === undefined ? debt.kind : tipo;
    if (!TIPOS.has(kind)) throw badRequest("El tipo debe ser 'cuotas' o 'libre'.");

    const centavos = importe === undefined ? Number(debt.principal_cents) : parseAmountToCents(importe);
    const day = dia === undefined ? debt.day_of_month : validarDia(dia);
    if (centavos === null || centavos <= 0) throw badRequest("El importe debe ser positivo.");
    if (day === undefined) throw badRequest("El día debe estar entre 1 y 31.");

    const cambios = { kind, principal_cents: centavos, updated_at: new Date() };

    if (kind === "cuotas") {
      const total = cuotas === undefined ? debt.installments_total : Number.parseInt(cuotas, 10);
      const yaPagadas = pagadas === undefined ? debt.installments_paid : Number.parseInt(pagadas, 10);
      if (!Number.isInteger(total) || total < 1) throw badRequest("Las cuotas deben ser al menos una.");
      if (!Number.isInteger(yaPagadas) || yaPagadas < 0 || yaPagadas > total) {
        throw badRequest("Las cuotas pagadas no pueden superar el total.");
      }
      cambios.installments_total = total;
      cambios.installments_paid = yaPagadas;
    } else {
      // Al pasar a abono libre las cuotas dejan de significar nada.
      cambios.installments_total = 1;
      cambios.installments_paid = 0;
    }

    // Lo abonado solo se toca si lo piden explícitamente: es la cifra que sale
    // del historial de abonos y no debe moverse como efecto colateral de editar
    // el concepto o el día de pago.
    let paidCents = Number(debt.paid_cents ?? 0);

    if (abonado !== undefined && abonado !== null && abonado !== "") {
      paidCents = parseAmountToCents(abonado);
      if (paidCents === null || paidCents < 0) throw badRequest("Lo abonado debe ser un importe positivo.");
    } else if (kind === "cuotas" && pagadas !== undefined && debt.kind === "cuotas") {
      // Corregir el número de cuotas pagadas a mano ajusta el saldo en la misma
      // proporción, que es lo que espera quien viene de la hoja de cálculo.
      const yaTeniaAbonos = await debtPayments.countDocuments({ debt_id: debt.id });
      if (yaTeniaAbonos === 0) {
        paidCents = Math.trunc((centavos * cambios.installments_paid) / cambios.installments_total);
      }
    }

    if (paidCents > centavos) throw badRequest("Lo abonado no puede superar el capital de la deuda.");

    Object.assign(cambios, estadoSaldo(DEUDAS, { ...debt, principal_cents: centavos }, paidCents));

    if (concepto !== undefined) cambios.concept = String(concepto).trim();
    if (dia !== undefined) cambios.day_of_month = day;
    if (notas !== undefined) cambios.notes = String(notas) || null;
    if (activa !== undefined) cambios.active = Boolean(activa);

    const updated = await debts.findOneAndUpdate(
      { id: debt.id },
      { $set: cambios },
      { returnDocument: "after" },
    );

    await audit(request, {
      action: "deuda.actualizada",
      entity: "debt",
      entityId: debt.id,
      meta: { tipo: kind, capital: centavos, abonado: paidCents },
    });

    return { deuda: deudaPublica(updated) };
  });

  // ── Abonos ───────────────────────────────────────────────────────────────

  /**
   * Registra un abono de cualquier importe. Es el camino normal para las deudas
   * sin cuota fija, y también sirve en las de cuotas cuando se paga distinto de
   * lo pactado.
   */
  app.post("/api/deudas/:id/abonos", async (request) => {
    const { importe, fecha, notas, cuentaCuota } = request.body ?? {};

    const debt = await debts.findOne({ id: request.params.id });
    if (!debt) throw notFound("Esa deuda no existe.");

    return anotarAbono(request, debt, {
      centavos: parseAmountToCents(importe),
      fecha,
      notas,
      cuentaCuota,
    });
  });

  /**
   * Deshace un abono. Puede hacerlo cualquiera de los dos: quien lo registró
   * necesita poder corregir un dedazo, y queda constancia en la auditoría.
   */
  app.delete("/api/deudas/:id/abonos/:abonoId", async (request) => {
    const debt = await debts.findOne({ id: request.params.id });
    if (!debt) throw notFound("Esa deuda no existe.");

    const abono = await debtPayments.findOne({ id: request.params.abonoId, debt_id: debt.id });
    if (!abono) throw notFound("Ese abono no existe.");

    const resultado = await deshacerAbono(DEUDAS, debt, abono);
    if (resultado.conflicto) throw conflict(resultado.conflicto);

    await audit(request, {
      action: "deuda.abono-deshecho",
      entity: "debt",
      entityId: debt.id,
      meta: { concepto: debt.concept, importe: Number(abono.amount_cents), fecha: abono.paid_on },
    });

    return { deuda: deudaPublica(resultado.saldo) };
  });

  /**
   * Atajo para las deudas por cuotas: registra un abono por el importe de la
   * siguiente cuota. Es el botón de "pagué la cuota de este mes".
   */
  app.post("/api/deudas/:id/cuota", async (request) => {
    const debt = await debts.findOne({ id: request.params.id });
    if (!debt) throw notFound("Esa deuda no existe.");

    if (debt.kind !== "cuotas") {
      throw badRequest("Esta deuda no tiene cuotas fijas: registra un abono con su importe.");
    }
    if (debt.installments_paid >= debt.installments_total) throw badRequest("Esa deuda ya está saldada.");

    const { cuotaSugeridaCentavos } = resumir(DEUDAS, debt);
    if (!cuotaSugeridaCentavos) throw badRequest("Esa deuda ya está saldada.");

    return anotarAbono(request, debt, {
      centavos: cuotaSugeridaCentavos,
      notas: null,
      cuentaCuota: true,
    });
  });

  app.delete("/api/deudas/:id", { preHandler: requireRole("owner") }, async (request) => {
    const debt = await debts.findOne({ id: request.params.id });
    if (!debt) throw notFound("Esa deuda no existe.");

    await debtPayments.deleteMany({ debt_id: debt.id });
    await debts.deleteOne({ id: debt.id });

    await audit(request, {
      action: "deuda.borrada",
      entity: "debt",
      entityId: debt.id,
      meta: { concepto: debt.concept },
    });

    return { ok: true };
  });

  async function anotarAbono(request, debt, { centavos, fecha, notas, cuentaCuota }) {
    const paidOn = fechaDeAbono(fecha);
    if (!paidOn) throw badRequest("La fecha del abono no es válida.");

    const resultado = await registrarAbono(DEUDAS, debt, {
      centavos,
      fecha: paidOn,
      notas,
      cuentaCuota,
      usuarioId: request.user?.id,
    });

    if (resultado.problema) throw badRequest(resultado.problema);
    if (resultado.conflicto) throw conflict(resultado.conflicto);

    await audit(request, {
      action: "deuda.abono-registrado",
      entity: "debt",
      entityId: debt.id,
      meta: {
        concepto: debt.concept,
        importe: centavos,
        fecha: paidOn,
        cuota: resultado.cuentaComoCuota,
      },
    });

    return { deuda: deudaPublica(resultado.saldo), abono: abonoPublico(resultado.abono) };
  }
}
