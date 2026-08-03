// Arranque del servicio: base de datos, migraciones, primer usuario y servidor.

import { buildApp } from "./app.js";
import { assertProductionConfig, config } from "./config.js";
import { bootstrapOwner } from "./auth/bootstrap.js";
import { purgeOldLoginAttempts } from "./auth/loginAttempts.js";
import { purgeExpiredSessions } from "./auth/sessions.js";
import { closeDb, initDb } from "./db/index.js";
import { runMigrations } from "./db/migrate.js";
import { sembrarReglasIniciales } from "./db/seed.js";

if (config.isProduction) assertProductionConfig();

await initDb();
await runMigrations();
await bootstrapOwner();
await sembrarReglasIniciales();

// Limpieza de arranque; ninguna es crítica.
await Promise.all([purgeExpiredSessions(), purgeOldLoginAttempts()]).catch(() => {});

const app = await buildApp();

await app.listen({ port: config.port, host: config.host });

async function apagar(senal) {
  app.log.info(`Recibida ${senal}, cerrando...`);
  await app.close();
  await closeDb();
  process.exit(0);
}

process.on("SIGTERM", () => void apagar("SIGTERM"));
process.on("SIGINT", () => void apagar("SIGINT"));
