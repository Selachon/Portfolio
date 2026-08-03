// Construcción de la aplicación Fastify.
//
// El mismo servicio sirve la API y la SPA del portal, a propósito: al compartir
// origen, la cookie de sesión es de primera parte y no hace falta CORS, ni
// cookies de terceros (que Safari bloquea), ni aflojar el CSP.

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { config } from "./config.js";
import { pingDb } from "./db/index.js";
import { registerAuthGuard } from "./auth/guard.js";
import { registerErrorHandler } from "./http/errors.js";
import accountRoutes from "./routes/accounts.js";
import analyticsRoutes from "./routes/analytics.js";
import budgetRoutes from "./routes/budget.js";
import categoryRuleRoutes from "./routes/categoryRules.js";
import debtRoutes from "./routes/debts.js";
import exportRoutes from "./routes/export.js";
import movementRoutes from "./routes/movements.js";
import rateRoutes from "./routes/rates.js";
import reportRoutes from "./routes/reports.js";
import statementRoutes from "./routes/statements.js";
import sessionRoutes from "./routes/session.js";
import userRoutes from "./routes/users.js";

const SERVER_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const PORTAL_DIST = resolve(SERVER_DIR, "..", "portal", "dist");

function registerSecurityHeaders(app) {
  app.addHook("onSend", async (request, reply, payload) => {
    // El portal no carga nada de fuera: ni fuentes, ni CDNs, ni analítica.
    reply.header(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join("; "),
    );
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

    // Nada de esto debe acabar en un buscador.
    reply.header("X-Robots-Tag", "noindex, nofollow, noarchive");

    if (config.isProduction) {
      reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    // Datos financieros: que ningún proxy ni el navegador los guarde en caché.
    if (request.url.startsWith("/api/")) {
      reply.header("Cache-Control", "no-store");
    } else if (request.url.startsWith("/assets/")) {
      // Los assets llevan hash en el nombre: se pueden cachear para siempre.
      reply.header("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      // El index.html no, o un despliegue nuevo tardaría en verse.
      reply.header("Cache-Control", "no-cache");
    }

    return payload;
  });
}

export async function buildApp({ logger = true } = {}) {
  const app = Fastify({
    logger,
    trustProxy: true, // Render va detrás de su propio proxy.
    bodyLimit: 2 * 1024 * 1024,
  });

  registerSecurityHeaders(app);
  registerErrorHandler(app);

  await app.register(cookie);
  await app.register(multipart, {
    limits: { fileSize: config.maxUploadBytes, files: 1 },
  });

  registerAuthGuard(app);

  await app.register(sessionRoutes);
  await app.register(userRoutes);
  await app.register(accountRoutes);
  await app.register(analyticsRoutes);
  await app.register(movementRoutes);
  await app.register(categoryRuleRoutes);
  await app.register(reportRoutes);
  await app.register(rateRoutes);
  await app.register(statementRoutes);
  await app.register(budgetRoutes);
  await app.register(debtRoutes);
  await app.register(exportRoutes);

  app.get("/api/salud", async () => {
    await pingDb();
    return { ok: true, base: "mongodb", hora: new Date().toISOString() };
  });

  // La SPA compilada. En desarrollo puede no existir todavía (se usa el
  // servidor de Vite en otro puerto), y entonces simplemente no se monta.
  const hayPortal = existsSync(join(PORTAL_DIST, "index.html"));

  if (hayPortal) {
    await app.register(fastifyStatic, { root: PORTAL_DIST, index: ["index.html"] });
  }

  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith("/api/")) {
      return reply.code(404).send({ error: { mensaje: "Ruta no encontrada." } });
    }
    if (!hayPortal) {
      return reply
        .code(404)
        .type("text/plain; charset=utf-8")
        .send("El portal no está compilado. Ejecuta `npm run build` dentro de portal/.");
    }
    // Cualquier otra ruta la resuelve el enrutador de la SPA.
    return reply.sendFile("index.html");
  });

  return app;
}
