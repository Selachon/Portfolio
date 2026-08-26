// Reglas de los saldos: lo que debes y lo que te deben.
//
// Las dos cosas se llevan igual, y por eso comparten este módulo. Hay dos
// formas de saldar una cantidad:
//
//   · "cuotas" — un número de pagos pactado. Se sabe cuántos van y cuántos
//     faltan.
//   · "libre"  — no hay cuota fija: se abona lo que se pueda, cuando se pueda,
//     y el saldo baja por lo abonado. Es el caso de un préstamo entre personas
//     o de una cantidad que se va cubriendo a pedazos.
//
// En ambos casos manda lo mismo: EL SALDO ES EL CAPITAL MENOS LO ABONADO. Los
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
 * última cuota cierra el saldo en cero exacto, en vez de dejar un resto raro.
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
 * Comprueba un abono contra el saldo.
 * Devuelve un mensaje si algo no cuadra, o null si se puede registrar.
 */
export function validarAbono({ amountCents, saldoActual, yaSaldado = "Eso ya está saldado." }) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    return "El abono debe ser un importe positivo.";
  }
  if (saldoActual <= 0) {
    return yaSaldado;
  }
  if (amountCents > saldoActual) {
    // Se rechaza en vez de recortar en silencio: si de verdad se pagó de más,
    // lo correcto es corregir el capital, no dejar un saldo negativo escondido.
    return "El abono supera el saldo pendiente. Corrige el importe o edita el capital.";
  }
  return null;
}

/**
 * Datos calculados que acompañan a un saldo en la API.
 * Recibe números sueltos a propósito: así sirve igual para una deuda (donde el
 * capital vive en `principal_cents`) que para un cobro (donde vive en
 * `amount_cents`), sin que el dominio tenga que saber de documentos.
 */
export function resumirSaldo({ principalCents, paidCents, kind, installmentsTotal, installmentsPaid }) {
  const capital = Number(principalCents);
  const abonado = Number(paidCents ?? 0);
  const restante = saldoPendiente({ principalCents: capital, paidCents: abonado });

  return {
    principalCents: capital,
    paidCents: abonado,
    restanteCentavos: restante,
    porcentaje: porcentajePagado({ principalCents: capital, paidCents: abonado }),
    saldada: restante === 0,
    cuotaSugeridaCentavos:
      kind === "cuotas"
        ? cuotaSugerida({
            principalCents: capital,
            paidCents: abonado,
            installmentsTotal,
            installmentsPaid,
          })
        : null,
  };
}

/**
 * Día del mes en que toca pagar. Devuelve null si no se indicó y `undefined`
 * si se indicó algo que no es un día, para que quien llame distinga "no hay"
 * de "está mal".
 */
export function validarDia(dia) {
  if (dia === undefined || dia === null || dia === "") return null;
  const valor = Number(dia);
  return Number.isInteger(valor) && valor >= 1 && valor <= 31 ? valor : undefined;
}
