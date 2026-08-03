// Reglas de negocio de un movimiento: cómo se normaliza, cómo se detecta un
// duplicado y cómo se clasifica.

import { createHash } from "node:crypto";

/**
 * Normaliza una descripción para comparar: sin acentos, sin espacios de más,
 * en minúsculas. El banco escribe "Pago PSE  Vanti" y "PAGO PSE VANTI" según el
 * mes, y las dos son lo mismo.
 */
export function normalizarDescripcion(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Sentido del movimiento a partir del signo. */
export function direccionDe(centavos) {
  return centavos < 0 ? "gasto" : "ingreso";
}

/**
 * Huella de un movimiento. Dos movimientos con la misma base son sospechosos
 * de estar cargados dos veces; el ordinal los distingue cuando de verdad
 * ocurrieron los dos (dos cafés iguales el mismo día pasa constantemente).
 */
export function calcularBaseDuplicado({ accountId, occurredOn, description, amountCents }) {
  return createHash("sha256")
    .update(
      [accountId, occurredOn, normalizarDescripcion(description), String(amountCents)].join("|"),
    )
    .digest("hex");
}

export function claveDuplicado(base, ordinal) {
  return `${base}:${ordinal}`;
}

/** Valida los campos de un movimiento que llega de la API o de un importador. */
export function validarMovimiento({ occurredOn, description, amountCents }) {
  const problemas = [];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn ?? "")) {
    problemas.push("La fecha no es válida.");
  }
  if (!String(description ?? "").trim()) {
    problemas.push("Falta la descripción.");
  }
  if (!Number.isSafeInteger(amountCents)) {
    problemas.push("El importe no es válido.");
  } else if (amountCents === 0) {
    problemas.push("Un movimiento de cero no se registra.");
  }

  return problemas;
}
