// Configuración del portal. Todo llega por variables de entorno: nada sensible
// vive en el código, porque este repositorio es público.

function readInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`La variable ${name} debe ser un número entero (recibido: "${raw}").`);
  }
  return parsed;
}

function readBool(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return raw === "true" || raw === "1";
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";

export const config = Object.freeze({
  nodeEnv,
  isProduction,
  port: readInt("PORT", 8787),
  host: process.env.HOST ?? "0.0.0.0",

  mongodbUri: process.env.MONGODB_URI ?? null,
  mongodbDatabase: process.env.MONGODB_DATABASE ?? "kora",

  // Origen público del portal, usado para cookies y cabeceras de seguridad.
  publicOrigin: process.env.PUBLIC_ORIGIN ?? "http://localhost:8787",

  session: Object.freeze({
    cookieName: "kora_sesion",
    // Días de vida de la sesión; se renueva sola mientras se use.
    lifetimeDays: readInt("SESSION_LIFETIME_DAYS", 14),
    // En local no hay HTTPS, así que la cookie Secure se desactiva sola.
    secureCookie: readBool("SESSION_SECURE_COOKIE", isProduction),
  }),

  // Coste del hash de contraseñas (scrypt de la librería estándar de Node).
  // 2^16 usa unos 67 MB por hash: suficiente para el plan gratuito de Render.
  passwordCostLog2: readInt("PASSWORD_COST_LOG2", 16),

  login: Object.freeze({
    maxAttempts: readInt("LOGIN_MAX_ATTEMPTS", 5),
    windowMinutes: readInt("LOGIN_WINDOW_MINUTES", 15),
  }),

  // Primer arranque: crea al dueño si todavía no hay ningún usuario.
  bootstrap: Object.freeze({
    email: process.env.BOOTSTRAP_OWNER_EMAIL ?? null,
    password: process.env.BOOTSTRAP_OWNER_PASSWORD ?? null,
    name: process.env.BOOTSTRAP_OWNER_NAME ?? "Propietario",
  }),

  // Tamaño máximo de un extracto subido.
  maxUploadBytes: readInt("MAX_UPLOAD_BYTES", 15 * 1024 * 1024),
});

export function assertProductionConfig() {
  const problemas = [];

  if (!config.mongodbUri) {
    problemas.push("Falta MONGODB_URI (la cadena de conexión de MongoDB Atlas).");
  }
  if (!config.publicOrigin.startsWith("https://")) {
    problemas.push("PUBLIC_ORIGIN debe ser una URL https en producción.");
  }
  if (!config.session.secureCookie) {
    problemas.push("SESSION_SECURE_COOKIE no puede desactivarse en producción.");
  }

  if (problemas.length > 0) {
    throw new Error(`Configuración de producción inválida:\n- ${problemas.join("\n- ")}`);
  }
}
