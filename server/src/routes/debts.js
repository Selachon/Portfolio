// Deudas propias (por cuotas o de abono libre) y cantidades pendientes de cobro.

import { audit } from "../audit.js";
import { collection, createDocument, transaction } from "../db/index.js";
import { badRequest, conflict, notFound } from "../http/errors.js";
import { requireRole } from "../auth/guard.js";
import { parseAmountToCents } from "../domain/money.js";
import { parseSpanishDate } from "../domain/dates.js";
import { TIPOS, resumirDeuda, saldoPendiente, validarAbono } from "../domain/debts.js";

const ESTADOS_COBRO = new Set(["pendiente", "cobrado", "perdonado"]);
const MONEDAS = new Set(["COP", "USD"]);

function deudaPublica(fila, abonos) {
  const calculado = resumirDeuda(fila);

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

function abonoPublico(fila) {
  return {
    id: fila.id,
    centavos: Number(fila.amount_cents),
    fecha: fila.paid_on,
    notas: fila.notes,
    cuentaCuota: fila.counts_installment === true,
    registradoEn: fila.created_at,
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

/** Campos que cambian cuando se mueve lo abonado. */
function estadoSaldo(fila, paidCents) {
  const restante = saldoPendiente({ principalCents: Number(fila.principal_cents), paidCents });

  return {
    paid_cents: paidCents,
    remaining_cents: restante,
    settled_at: restante === 0 ? (fila.settled_at ?? new Date()) : null,
    updated_at: new Date(),
  };
}

export default async function debtRoutes(app) {
  const debts = collection("debts");
  const debtPayments = collection("debt_payments");
  const receivables = collection("receivables");

  app.get("/api/deudas", async () => {
    const rows = await debts.find({}).sort({ active: -1, concept: 1 }).toArray();
    const activas = rows.filter((row) => row.active);
    const porCuotas = activas.filter((row) => row.kind === "cuotas");

    return {
      deudas: rows.map((row) => deudaPublica(row)),
      resumen: {
        restanteCentavos: activas.reduce((total, row) => total + resumirDeuda(row).restanteCentavos, 0),
        capitalCentavos: activas.reduce((total, row) => total + Number(row.principal_cents), 0),
        abonadoCentavos: activas.reduce((total, row) => total + Number(row.paid_cents ?? 0), 0),
        cuotasPendientes: porCuotas.reduce(
          (total, row) => total + row.installments_total - row.installments_paid,
          0,
        ),
        activas: activas.length,
        saldadas: rows.filter((row) => resumirDeuda(row).saldada).length,
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

    Object.assign(cambios, estadoSaldo({ ...debt, principal_cents: centavos }, paidCents));

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
   * Registra un abono contra una deuda y deja el saldo cuadrado.
   *
   * Vive aquí y no en cada ruta porque el abono libre y el atajo de "pagué la
   * cuota" son lo mismo con distinto importe: si se duplicara, una de las dos
   * acabaría olvidándose de tocar el contador de cuotas o la fecha de saldo.
   */
  async function registrarAbono(request, debt, { centavos, fecha, notas, cuentaCuota }) {
    const saldoActual = resumirDeuda(debt).restanteCentavos;
    const problema = validarAbono({ amountCents: centavos ?? 0, saldoActual });
    if (problema) throw badRequest(problema);

    const paidOn = fecha ? parseSpanishDate(fecha) : new Date().toISOString().slice(0, 10);
    if (!paidOn) throw badRequest("La fecha del abono no es válida.");

    // Solo las deudas por cuotas pueden marcar un abono como cuota cubierta.
    const cuentaComoCuota =
      debt.kind === "cuotas" &&
      cuentaCuota !== false &&
      debt.installments_paid < debt.installments_total;

    const resultado = await transaction(async ({ collection: coleccion }) => {
      const deudasTx = coleccion("debts");
      const abonosTx = coleccion("debt_payments");

      // Se relee dentro de la transacción y la escritura se condiciona a que lo
      // abonado no haya cambiado: dos personas registrando a la vez no pueden
      // pasarse del saldo.
      const actual = await deudasTx.findOne({ id: debt.id });
      const abonadoAntes = Number(actual.paid_cents ?? 0);
      const saldoAhora = saldoPendiente({
        principalCents: Number(actual.principal_cents),
        paidCents: abonadoAntes,
      });

      const conflicto = validarAbono({ amountCents: centavos, saldoActual: saldoAhora });
      if (conflicto) return { conflicto };

      const abono = createDocument({
        debt_id: actual.id,
        amount_cents: centavos,
        paid_on: paidOn,
        notes: notas ?? null,
        counts_installment: cuentaComoCuota,
        created_by: request.user?.id ?? null,
      });

      await abonosTx.insertOne(abono);

      const cambios = estadoSaldo(actual, abonadoAntes + centavos);
      if (cuentaComoCuota) cambios.installments_paid = actual.installments_paid + 1;

      const escrito = await deudasTx.findOneAndUpdate(
        { id: actual.id, paid_cents: abonadoAntes },
        { $set: cambios },
        { returnDocument: "after" },
      );

      if (!escrito) {
        return { conflicto: "La deuda cambió mientras registrabas el abono. Inténtalo otra vez." };
      }
      return { deuda: escrito, abono };
    });

    if (resultado.conflicto) throw conflict(resultado.conflicto);

    await audit(request, {
      action: "deuda.abono-registrado",
      entity: "debt",
      entityId: debt.id,
      meta: {
        concepto: debt.concept,
        importe: centavos,
        fecha: paidOn,
        cuota: cuentaComoCuota,
      },
    });

    return { deuda: deudaPublica(resultado.deuda), abono: abonoPublico(resultado.abono) };
  }


  /**
   * Registra un abono de cualquier importe. Es el camino normal para las deudas
   * sin cuota fija, y también sirve en las de cuotas cuando se paga distinto de
   * lo pactado.
   */
  app.post("/api/deudas/:id/abonos", async (request) => {
    const { importe, fecha, notas, cuentaCuota } = request.body ?? {};

    const debt = await debts.findOne({ id: request.params.id });
    if (!debt) throw notFound("Esa deuda no existe.");

    return registrarAbono(request, debt, {
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

    const resultado = await transaction(async ({ collection: coleccion }) => {
      const deudasTx = coleccion("debts");
      const abonosTx = coleccion("debt_payments");

      const borrado = await abonosTx.deleteOne({ id: abono.id });
      if (borrado.deletedCount === 0) return { conflicto: "Ese abono ya se había deshecho." };

      const actual = await deudasTx.findOne({ id: debt.id });
      const cambios = estadoSaldo(actual, Math.max(0, Number(actual.paid_cents ?? 0) - Number(abono.amount_cents)));
      if (abono.counts_installment) {
        cambios.installments_paid = Math.max(0, actual.installments_paid - 1);
      }

      return { deuda: await deudasTx.findOneAndUpdate({ id: debt.id }, { $set: cambios }, { returnDocument: "after" }) };
    });

    if (resultado.conflicto) throw conflict(resultado.conflicto);

    await audit(request, {
      action: "deuda.abono-deshecho",
      entity: "debt",
      entityId: debt.id,
      meta: { concepto: debt.concept, importe: Number(abono.amount_cents), fecha: abono.paid_on },
    });

    return { deuda: deudaPublica(resultado.deuda) };
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

    const { cuotaSugeridaCentavos } = resumirDeuda(debt);
    if (!cuotaSugeridaCentavos) throw badRequest("Esa deuda ya está saldada.");

    return registrarAbono(request, debt, {
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

  // ── Lo que te deben ──────────────────────────────────────────────────────

  app.get("/api/deudores", async () => {
    const rows = await receivables.find({}).sort({ status: 1, debtor: 1 }).toArray();
    rows.sort(
      (a, b) =>
        (a.status === "pendiente" ? -1 : 1) - (b.status === "pendiente" ? -1 : 1) ||
        a.debtor.localeCompare(b.debtor),
    );

    return {
      deudores: rows.map(deudorPublico),
      resumen: {
        pendienteCentavos: rows
          .filter((row) => row.status === "pendiente")
          .reduce((total, row) => total + Number(row.amount_cents), 0),
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
      debtor: String(deudor).trim(),
      amount_cents: centavos,
      currency,
      day_of_month: day,
      notes: notas ?? null,
      status: "pendiente",
    });
    await receivables.insertOne(receivable);
    await audit(request, { action: "deudor.creado", entity: "receivable", entityId: receivable.id, meta: { deudor } });
    return { deudor: deudorPublico(receivable) };
  });

  app.patch("/api/deudores/:id", async (request) => {
    const { deudor, importe, dia, notas, estado } = request.body ?? {};
    const row = await receivables.findOne({ id: request.params.id });
    if (!row) throw notFound("Ese registro no existe.");
    if (estado !== undefined && !ESTADOS_COBRO.has(estado)) {
      throw badRequest("El estado debe ser pendiente, cobrado o perdonado.");
    }
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
