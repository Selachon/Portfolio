// Registro y anulación de abonos, compartido por las deudas y por los cobros.
//
// Vive aquí y no en cada ruta porque las dos hacen exactamente lo mismo con
// distinto nombre de colección: si se duplicara, una de las dos acabaría
// olvidándose de tocar el contador de cuotas, la fecha de saldo o —peor— la
// condición que evita que dos personas registrando a la vez se pasen del saldo.

import { createDocument, transaction } from "../db/index.js";
import { parseSpanishDate } from "../domain/dates.js";
import { resumirSaldo, saldoPendiente, validarAbono } from "../domain/saldos.js";

/**
 * Describe dónde vive cada saldo. Lo único que cambia entre deudas y cobros.
 *
 *   coleccion       nombre de la colección del saldo
 *   coleccionAbonos nombre de la colección de su historial
 *   campoCapital    campo donde está el capital (las deudas y los cobros
 *                   heredaron nombres distintos y no vale la pena migrarlos)
 *   campoEnlace     campo del abono que apunta al saldo
 */
export const DEUDAS = Object.freeze({
  coleccion: "debts",
  coleccionAbonos: "debt_payments",
  campoCapital: "principal_cents",
  campoEnlace: "debt_id",
  yaSaldado: "Esa deuda ya está saldada.",
});

export const COBROS = Object.freeze({
  coleccion: "receivables",
  coleccionAbonos: "receivable_payments",
  campoCapital: "amount_cents",
  campoEnlace: "receivable_id",
  yaSaldado: "Ese cobro ya está saldado.",
});

/** Lee el capital de un documento sin que quien llame tenga que saber el campo. */
export function capitalDe(esquema, documento) {
  return Number(documento[esquema.campoCapital]);
}

/** Resumen calculado de un saldo, con los nombres de campo del esquema. */
export function resumir(esquema, documento) {
  return resumirSaldo({
    principalCents: capitalDe(esquema, documento),
    paidCents: documento.paid_cents ?? 0,
    kind: documento.kind,
    installmentsTotal: documento.installments_total,
    installmentsPaid: documento.installments_paid,
  });
}

/** Campos que cambian cuando se mueve lo abonado. */
export function estadoSaldo(esquema, documento, paidCents) {
  const restante = saldoPendiente({ principalCents: capitalDe(esquema, documento), paidCents });

  return {
    paid_cents: paidCents,
    remaining_cents: restante,
    settled_at: restante === 0 ? (documento.settled_at ?? new Date()) : null,
    updated_at: new Date(),
  };
}

/**
 * Registra un abono y deja el saldo cuadrado.
 * Devuelve `{ conflicto }` si otra escritura se adelantó, para que la ruta
 * decida cómo contárselo a quien lo pidió.
 */
export async function registrarAbono(esquema, documento, { centavos, fecha, notas, cuentaCuota, usuarioId, extra = {} }) {
  const saldoActual = resumir(esquema, documento).restanteCentavos;
  const problema = validarAbono({
    amountCents: centavos ?? 0,
    saldoActual,
    yaSaldado: esquema.yaSaldado,
  });
  if (problema) return { problema };

  // Solo un saldo por cuotas puede marcar un abono como cuota cubierta.
  const cuentaComoCuota =
    documento.kind === "cuotas" &&
    cuentaCuota !== false &&
    documento.installments_paid < documento.installments_total;

  return transaction(async ({ collection }) => {
    const saldos = collection(esquema.coleccion);
    const abonos = collection(esquema.coleccionAbonos);

    // Se relee dentro de la transacción y la escritura se condiciona a que lo
    // abonado no haya cambiado: dos personas registrando a la vez no pueden
    // pasarse del saldo.
    const actual = await saldos.findOne({ id: documento.id });
    const abonadoAntes = Number(actual.paid_cents ?? 0);
    const saldoAhora = saldoPendiente({
      principalCents: capitalDe(esquema, actual),
      paidCents: abonadoAntes,
    });

    const conflicto = validarAbono({
      amountCents: centavos,
      saldoActual: saldoAhora,
      yaSaldado: esquema.yaSaldado,
    });
    if (conflicto) return { conflicto };

    const abono = createDocument({
      [esquema.campoEnlace]: actual.id,
      amount_cents: centavos,
      paid_on: fecha,
      notes: notas ?? null,
      counts_installment: cuentaComoCuota,
      created_by: usuarioId ?? null,
    });

    await abonos.insertOne(abono);

    const cambios = { ...estadoSaldo(esquema, actual, abonadoAntes + centavos), ...extra };
    if (cuentaComoCuota) cambios.installments_paid = actual.installments_paid + 1;

    const escrito = await saldos.findOneAndUpdate(
      { id: actual.id, paid_cents: abonadoAntes },
      { $set: cambios },
      { returnDocument: "after" },
    );

    if (!escrito) {
      return { conflicto: "El saldo cambió mientras registrabas el abono. Inténtalo otra vez." };
    }
    return { saldo: escrito, abono, cuentaComoCuota };
  });
}

/** Deshace un abono y devuelve el saldo a como estaba. */
export async function deshacerAbono(esquema, documento, abono, { extra = {} } = {}) {
  return transaction(async ({ collection }) => {
    const saldos = collection(esquema.coleccion);
    const abonos = collection(esquema.coleccionAbonos);

    const borrado = await abonos.deleteOne({ id: abono.id });
    if (borrado.deletedCount === 0) return { conflicto: "Ese abono ya se había deshecho." };

    const actual = await saldos.findOne({ id: documento.id });
    const abonado = Math.max(0, Number(actual.paid_cents ?? 0) - Number(abono.amount_cents));

    const cambios = { ...estadoSaldo(esquema, actual, abonado), ...extra };
    if (abono.counts_installment) {
      cambios.installments_paid = Math.max(0, actual.installments_paid - 1);
    }

    return {
      saldo: await saldos.findOneAndUpdate({ id: documento.id }, { $set: cambios }, { returnDocument: "after" }),
    };
  });
}

/** Un abono tal como lo ve la API. Igual para deudas y cobros. */
export function abonoPublico(fila) {
  return {
    id: fila.id,
    centavos: Number(fila.amount_cents),
    fecha: fila.paid_on,
    notas: fila.notes,
    cuentaCuota: fila.counts_installment === true,
    registradoEn: fila.created_at,
  };
}

/** Fecha de un abono: la que pidan, o la de hoy. */
export function fechaDeAbono(fecha) {
  if (!fecha) return new Date().toISOString().slice(0, 10);
  return parseSpanishDate(fecha);
}
