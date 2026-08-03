// Hash de contraseñas con scrypt, que viene en la librería estándar de Node.
//
// Se eligió scrypt en vez de argon2 a propósito: argon2 exige un módulo nativo
// y este servicio tiene que desplegarse sin sorpresas en el plan gratuito de
// Render. scrypt es memory-hard, está en la librería estándar y no añade ni una
// dependencia. Con N=2^16 cada verificación cuesta ~67 MB y ~100 ms, que sobra
// para dos usuarios que entran un puñado de veces al mes.

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { config } from "../config.js";

const scryptAsync = promisify(scrypt);

const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const BLOCK_SIZE = 8; // r
const PARALLELIZATION = 1; // p

export const MIN_PASSWORD_LENGTH = 12;

function memoryLimit(costLog2) {
  // scrypt necesita 128 · N · r bytes; se pide un 50 % extra de margen.
  return Math.ceil(128 * 2 ** costLog2 * BLOCK_SIZE * 1.5);
}

async function derive(password, salt, costLog2) {
  return scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH, {
    N: 2 ** costLog2,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
    maxmem: memoryLimit(costLog2),
  });
}

/** Devuelve una cadena autodescriptiva: `scrypt$N$r$p$sal$hash`. */
export async function hashPassword(password) {
  const costLog2 = config.passwordCostLog2;
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, costLog2);

  return [
    "scrypt",
    2 ** costLog2,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

/**
 * Verifica una contraseña contra su hash. Nunca lanza por un hash mal formado:
 * devuelve false, para que un registro corrupto no revele nada.
 */
export async function verifyPassword(password, stored) {
  if (typeof stored !== "string") return false;

  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, nRaw, rRaw, pRaw, saltRaw, hashRaw] = parts;
  const n = Number.parseInt(nRaw, 10);
  const r = Number.parseInt(rRaw, 10);
  const p = Number.parseInt(pRaw, 10);

  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
  if (n < 2 || (n & (n - 1)) !== 0) return false; // N tiene que ser potencia de dos

  try {
    const salt = Buffer.from(saltRaw, "base64url");
    const expected = Buffer.from(hashRaw, "base64url");

    const actual = await scryptAsync(password.normalize("NFKC"), salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: memoryLimit(Math.log2(n)),
    });

    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// Hash de referencia para gastar el mismo tiempo cuando el correo no existe.
// Sin esto, un atacante distingue "usuario inexistente" de "clave incorrecta"
// midiendo cuánto tarda la respuesta.
let dummyHashPromise = null;

export async function wastePasswordTime(password) {
  dummyHashPromise ??= hashPassword(randomBytes(32).toString("base64url"));
  await verifyPassword(password, await dummyHashPromise);
}

/** Reglas mínimas de contraseña. Devuelve un mensaje o null si está bien. */
export function validatePasswordStrength(password) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (password.length > 200) {
    return "La contraseña no puede superar los 200 caracteres.";
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "La contraseña debe combinar letras y números.";
  }
  return null;
}
