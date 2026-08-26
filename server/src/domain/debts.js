// Reglas de las deudas.
//
// Hay dos formas de deber dinero y el portal soporta las dos:
//
//   · "cuotas" — un crédito con número de cuotas pactado. Se sabe cuántas van
//     y cuántas faltan.
//   · "libre"  — no hay cuota fija: se abona lo que se pueda, cuando se pueda,
//     y el saldo baja por lo abonado. Es el caso de un préstamo entre personas
//     o de una deuda que se va cubriendo a pedazos.
//
// En ambos casos manda lo mismo: el SALDO ES EL CAPITAL MENOS LO ABONADO. Los
// abonos se guardan uno a uno en su propio historial, así que la cifra siempre
// se puede explicar sumando movimientos reales en vez de confiar en una resta
// que alguien tecleó.

export const TIPOS = new Set(["cuotas", "libre"]);

/** Saldo pendiente. Nunca baja de cero por mucho que se abone de más. */
export function saldoPendiente({ principalCents, paidCents }) {
  return Math.max(0, principalCents - paidCents);
}

/**
 * Importe sugerido para la siguiente cuota.
 *
 * Se reparte el SALDO entre las cuotas que faltan, no el capital entre el total.
 * Así los centavos que se pierden al redondear se van repartiendo solos y la
 * última cuota cierra la deuda en cero exacto, en vez de dejar un resto raro.
 */
export function cuotaSugerida({ principalCents, paidCents, installmentsTotal, installmentsPaid }) {
  const pendientes = installmentsTotal - installmentsPaid;
  if (pendientes <= 0) return 0;

  return Math.round(saldoPendiente({ principalCents, paidCents }) / pendientes);
}

/** Porcentaje cubierto, para la barra de avance. */
export function porcentajePagado({ principalCents, paidCents }) {
  if (principalCents <= 0) return 100;
  return Math.min(100, Math.round((paidCents / principalCents) * 100));
}

/**
 * Comprueba un abono contra la deuda.
 * Devuelve un mensaje si algo no cuadra, o null si se puede registrar.
 */
export function validarAbono({ amountCents, saldoActual }) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    return "El abono debe ser un importe positivo.";
  }
  if (saldoActual <= 0) {
    return "Esa deuda ya está saldada.";
  }
  if (amountCents > saldoActual) {
    // Se rechaza en vez de recortar en silencio: si de verdad se pagó de más,
    // lo correcto es corregir el capital, no dejar un saldo negativo escondido.
    return "El abono supera el saldo pendiente. Corrige el importe o edita el capital de la deuda.";
  }
  return null;
}

/** Datos calculados que acompañan a una deuda en la API. */
export function resumirDeuda(fila) {
  const principalCents = Number(fila.principal_cents);
  const paidCents = Number(fila.paid_cents ?? 0);
  const esCuotas = fila.kind === "cuotas";

  const restante = saldoPendiente({ principalCents, paidCents });

  return {
    principalCents,
    paidCents,
    restanteCentavos: restante,
    porcentaje: porcentajePagado({ principalCents, paidCents }),
    saldada: restante === 0,
    cuotaSugeridaCentavos: esCuotas
      ? cuotaSugerida({
          principalCents,
          paidCents,
          installmentsTotal: fila.installments_total,
          installmentsPaid: fila.installments_paid,
        })
      : null,
  };
}
