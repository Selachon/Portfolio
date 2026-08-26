// Cobros: lo que te deben.
//
// Se lleva igual que una deuda propia, porque es el mismo problema visto del
// otro lado: alguien puede devolverte el dinero en cuotas pactadas o irte
// abonando lo que puede. En ambos casos el saldo baja por lo que de verdad
// entró, y cada abono queda en el historial con su fecha.

import { audit } from "../audit.js";
import { collection, createDocument } from "../db/index.js";
import { badRequest, conflict, notFound } from "../http/errors.js";
import { requireRole } from "../auth/guard.js";
import { parseAmountToCents } from "../domain/money.js";
import { TIPOS, saldoPendiente, validarDia } from "../domain/saldos.js";
import {
  COBROS,
  abonoPublico,
  deshacerAbono,
  estadoSaldo,
  fechaDeAbono,
  registrarAbono,
  resumir,
} from "../repos/saldos.js";

const ESTADOS = new Set(["pendiente", "cobrado", "perdonado"]);
const MONEDAS = new Set(["COP", "USD"]);

function cobroPublico(fila, abonos) {
  const calculado = resumir(COBROS, fila);

  return {
    id: fila.id,
    deudor: fila.debtor,
    tipo: fila.kind ?? "libre",
    centavos: calculado.principalCents,
    abonadoCentavos: calculado.paidCents,
    restanteCentavos: calculado.restanteCentavos,
    porcentaje: calculado.porcentaje,
    saldada: calculado.saldada,
    moneda: fila.currency,
    dia: fila.day_of_month,
    cuotas: fila.kind === "cuotas" ? fila.installments_total : null,
    pagadas: fila.kind === "cuotas" ? fila.installments_paid : null,
    pendientes: fila.kind === "cuotas" ? fila.installments_total - fila.installments_paid : null,
    cuotaSugeridaCentavos: calculado.cuotaSugeridaCentavos,
    notas: fila.notes,
    estado: fila.status,
    saldadaEn: fila.settled_at ?? null,
    abonos: abonos?.map(abonoPublico),
  };
}

/**
 * El estado se deduce del saldo, salvo "perdonado", que es una decisión y no
 * un cálculo: se marca a mano y se respeta aunque quede saldo por cobrar.
 */
function estadoSegunSaldo(estadoActual, restante) {
  if (estadoActual === "perdonado") return "perdonado";
  return restante === 0 ? "cobrado" : "pendiente";
}

export default async function receivableRoutes(app) {
  const receivables = collection("receivables");
  const receivablePayments = collection("receivable_payments");

  app.get("/api/deudores", async () => {
    const rows = await receivables.find({}).toArray();
    rows.sort(
      (a, b) =>
        (a.status === "pendiente" ? 0 : 1) - (b.status === "pendiente" ? 0 : 1) ||
        a.debtor.localeCompare(b.debtor),
    );

    const pendientes = rows.filter((row) => row.status === "pendiente");
    const porCuotas = pendientes.filter((row) => row.kind === "cuotas");

    return {
      deudores: rows.map((row) => cobroPublico(row)),
      resumen: {
        // Lo que de verdad falta por entrar, no el total original.
        pendienteCentavos: pendientes.reduce(
          (total, row) => total + resumir(COBROS, row).restanteCentavos,
          0,
        ),
        prestadoCentavos: pendientes.reduce((total, row) => total + Number(row.amount_cents), 0),
        recuperadoCentavos: pendientes.reduce((total, row) => total + Number(row.paid_cents ?? 0), 0),
        cuotasPendientes: porCuotas.reduce(
          (total, row) => total + row.installments_total - row.installments_paid,
          0,
        ),
        pendientes: pendientes.length,
        cobrados: rows.filter((row) => row.status === "cobrado").length,
      },
    };
  });

  /** Un cobro con todo su historial de abonos. */
  app.get("/api/deudores/:id", async (request) => {
    const row = await receivables.findOne({ id: request.params.id });
    if (!row) throw notFound("Ese registro no existe.");

    const abonos = await receivablePayments
      .find({ receivable_id: row.id })
      .sort({ paid_on: -1, created_at: -1 })
      .toArray();

    return { deudor: cobroPublico(row, abonos) };
  });

  app.post("/api/deudores", async (request) => {
    const {
      deudor,
      importe,
      moneda = "COP",
      dia,
      tipo = "libre",
      cuotas,
      pagadas = 0,
      abonado,
      notas,
    } = request.body ?? {};

    const centavos = parseAmountToCents(importe);
    const currency = String(moneda).toUpperCase();
    const day = validarDia(dia);

    if (!String(deudor ?? "").trim()) throw badRequest("Falta el nombre de quien debe.");
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
        throw badRequest("Las cuotas cobradas no pueden superar el total.");
      }
      paidCents =
        abonado === undefined || abonado === null || abonado === ""
          ? Math.trunc((centavos * yaPagadas) / total)
          : parseAmountToCents(abonado);
    } else {
      paidCents =
        abonado === undefined || abonado === null || abonado === "" ? 0 : parseAmountToCents(abonado);
    }

    if (paidCents === null || paidCents < 0) throw badRequest("Lo cobrado debe ser un importe positivo.");
    if (paidCents > centavos) throw badRequest("Lo cobrado no puede superar el total prestado.");

    const restante = saldoPendiente({ principalCents: centavos, paidCents });
    const receivable = createDocument({
      debtor: String(deudor).trim(),
      kind: tipo,
      amount_cents: centavos,
      currency,
      day_of_month: day,
      installments_total: total,
      installments_paid: yaPagadas,
      paid_cents: paidCents,
      remaining_cents: restante,
      settled_at: restante === 0 ? new Date() : null,
      notes: notas ?? null,
      status: restante === 0 ? "cobrado" : "pendiente",
    });

    await receivables.insertOne(receivable);
    await audit(request, {
      action: "deudor.creado",
      entity: "receivable",
      entityId: receivable.id,
      meta: { deudor, tipo, total: centavos, cobrado: paidCents },
    });

    return { deudor: cobroPublico(receivable, []) };
  });

  app.patch("/api/deudores/:id", async (request) => {
    const { deudor, importe, dia, tipo, cuotas, pagadas, abonado, notas, estado } = request.body ?? {};
    const row = await receivables.findOne({ id: request.params.id });
    if (!row) throw notFound("Ese registro no existe.");

    if (estado !== undefined && !ESTADOS.has(estado)) {
      throw badRequest("El estado debe ser pendiente, cobrado o perdonado.");
    }

    const kind = tipo === undefined ? (row.kind ?? "libre") : tipo;
    if (!TIPOS.has(kind)) throw badRequest("El tipo debe ser 'cuotas' o 'libre'.");

    const centavos = importe === undefined ? Number(row.amount_cents) : parseAmountToCents(importe);
    const day = dia === undefined ? row.day_of_month : validarDia(dia);
    if (centavos === null || centavos <= 0) throw badRequest("El importe debe ser positivo.");
    if (day === undefined) throw badRequest("El día debe estar entre 1 y 31.");

    const cambios = { kind, amount_cents: centavos, updated_at: new Date() };

    if (kind === "cuotas") {
      const total = cuotas === undefined ? (row.installments_total ?? 1) : Number.parseInt(cuotas, 10);
      const yaPagadas = pagadas === undefined ? (row.installments_paid ?? 0) : Number.parseInt(pagadas, 10);
      if (!Number.isInteger(total) || total < 1) throw badRequest("Las cuotas deben ser al menos una.");
      if (!Number.isInteger(yaPagadas) || yaPagadas < 0 || yaPagadas > total) {
        throw badRequest("Las cuotas cobradas no pueden superar el total.");
      }
      cambios.installments_total = total;
      cambios.installments_paid = yaPagadas;
    } else {
      cambios.installments_total = 1;
      cambios.installments_paid = 0;
    }

    let paidCents = Number(row.paid_cents ?? 0);

    if (abonado !== undefined && abonado !== null && abonado !== "") {
      paidCents = parseAmountToCents(abonado);
      if (paidCents === null || paidCents < 0) throw badRequest("Lo cobrado debe ser un importe positivo.");
    } else if (estado === "cobrado") {
      // Marcarlo como cobrado a mano equivale a decir que entró todo: si no se
      // ajustara, el saldo seguiría diciendo que falta dinero por entrar.
      paidCents = centavos;
    } else if (kind === "cuotas" && pagadas !== undefined && row.kind === "cuotas") {
      const yaTeniaAbonos = await receivablePayments.countDocuments({ receivable_id: row.id });
      if (yaTeniaAbonos === 0) {
        paidCents = Math.trunc((centavos * cambios.installments_paid) / cambios.installments_total);
      }
    }

    if (paidCents > centavos) throw badRequest("Lo cobrado no puede superar el total prestado.");

    Object.assign(cambios, estadoSaldo(COBROS, { ...row, amount_cents: centavos }, paidCents));
    cambios.status =
      estado === "perdonado" || estado === "pendiente"
        ? estado
        : estadoSegunSaldo(estado ?? row.status, cambios.remaining_cents);

    if (deudor !== undefined) cambios.debtor = String(deudor).trim();
    if (dia !== undefined) cambios.day_of_month = day;
    if (notas !== undefined) cambios.notes = String(notas) || null;

    const updated = await receivables.findOneAndUpdate(
      { id: row.id },
      { $set: cambios },
      { returnDocument: "after" },
    );

    await audit(request, {
      action: "deudor.actualizado",
      entity: "receivable",
      entityId: row.id,
      meta: { estado: cambios.status, total: centavos, cobrado: paidCents },
    });

    return { deudor: cobroPublico(updated) };
  });

  // ── Abonos recibidos ─────────────────────────────────────────────────────

  app.post("/api/deudores/:id/abonos", async (request) => {
    const { importe, fecha, notas, cuentaCuota } = request.body ?? {};

    const row = await receivables.findOne({ id: request.params.id });
    if (!row) throw notFound("Ese registro no existe.");
    if (row.status === "perdonado") throw badRequest("Ese cobro está marcado como perdonado.");

    return anotarAbono(request, row, {
      centavos: parseAmountToCents(importe),
      fecha,
      notas,
      cuentaCuota,
    });
  });

  app.delete("/api/deudores/:id/abonos/:abonoId", async (request) => {
    const row = await receivables.findOne({ id: request.params.id });
    if (!row) throw notFound("Ese registro no existe.");

    const abono = await receivablePayments.findOne({
      id: request.params.abonoId,
      receivable_id: row.id,
    });
    if (!abono) throw notFound("Ese abono no existe.");

    const resultado = await deshacerAbono(COBROS, row, abono, { extra: { status: "pendiente" } });
    if (resultado.conflicto) throw conflict(resultado.conflicto);

    await audit(request, {
      action: "deudor.abono-deshecho",
      entity: "receivable",
      entityId: row.id,
      meta: { deudor: row.debtor, importe: Number(abono.amount_cents), fecha: abono.paid_on },
    });

    return { deudor: cobroPublico(resultado.saldo) };
  });

  /** Atajo para los cobros por cuotas: registra la siguiente cuota completa. */
  app.post("/api/deudores/:id/cuota", async (request) => {
    const row = await receivables.findOne({ id: request.params.id });
    if (!row) throw notFound("Ese registro no existe.");

    if (row.kind !== "cuotas") {
      throw badRequest("Ese cobro no tiene cuotas fijas: registra un abono con su importe.");
    }
    if (row.installments_paid >= row.installments_total) throw badRequest("Ese cobro ya está saldado.");

    const { cuotaSugeridaCentavos } = resumir(COBROS, row);
    if (!cuotaSugeridaCentavos) throw badRequest("Ese cobro ya está saldado.");

    return anotarAbono(request, row, {
      centavos: cuotaSugeridaCentavos,
      notas: null,
      cuentaCuota: true,
    });
  });

  app.delete("/api/deudores/:id", { preHandler: requireRole("owner") }, async (request) => {
    const row = await receivables.findOne({ id: request.params.id });
    if (!row) throw notFound("Ese registro no existe.");

    await receivablePayments.deleteMany({ receivable_id: row.id });
    await receivables.deleteOne({ id: row.id });

    await audit(request, {
      action: "deudor.borrado",
      entity: "receivable",
      entityId: row.id,
      meta: { deudor: row.debtor },
    });

    return { ok: true };
  });

  async function anotarAbono(request, row, { centavos, fecha, notas, cuentaCuota }) {
    const paidOn = fechaDeAbono(fecha);
    if (!paidOn) throw badRequest("La fecha del abono no es válida.");

    const resultado = await registrarAbono(COBROS, row, {
      centavos,
      fecha: paidOn,
      notas,
      cuentaCuota,
      usuarioId: request.user?.id,
    });

    if (resultado.problema) throw badRequest(resultado.problema);
    if (resultado.conflicto) throw conflict(resultado.conflicto);

    // Cuando entra el último peso, el cobro pasa a cobrado por sí solo.
    const saldado = resumir(COBROS, resultado.saldo).saldada;
    const saldo = saldado
      ? await receivables.findOneAndUpdate(
          { id: row.id },
          { $set: { status: "cobrado", updated_at: new Date() } },
          { returnDocument: "after" },
        )
      : resultado.saldo;

    await audit(request, {
      action: "deudor.abono-registrado",
      entity: "receivable",
      entityId: row.id,
      meta: {
        deudor: row.debtor,
        importe: centavos,
        fecha: paidOn,
        cuota: resultado.cuentaComoCuota,
      },
    });

    return { deudor: cobroPublico(saldo), abono: abonoPublico(resultado.abono) };
  }
}
