// Entrar, salir, ver quién soy y cambiar la contraseña.

import { config } from "../config.js";
import { audit } from "../audit.js";
import { collection } from "../db/index.js";
import { badRequest, tooManyRequests, unauthorized } from "../http/errors.js";
import { isLoginBlocked, recordLoginAttempt } from "../auth/loginAttempts.js";
import {
  hashPassword,
  validatePasswordStrength,
  verifyPassword,
  wastePasswordTime,
} from "../auth/password.js";
import { createSession, revokeAllSessions, revokeSession } from "../auth/sessions.js";

// Un mensaje único para credenciales malas: no se distingue "ese correo no
// existe" de "esa clave no es".
const CREDENCIALES_INVALIDAS = "Correo o contraseña incorrectos.";

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.session.secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: config.session.lifetimeDays * 86_400,
  };
}

function usuarioPublico(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    nombre: user.name,
    rol: user.role,
    debeCambiarContrasena: user.mustChangePassword === true,
  };
}

export default async function sessionRoutes(app) {
  // Estado de la sesión: lo consulta la SPA al cargar.
  app.get("/api/sesion/estado", async (request) => ({
    autenticado: Boolean(request.user),
    usuario: usuarioPublico(request.user),
  }));

  app.post("/api/sesion/entrar", async (request, reply) => {
    const { correo, contrasena } = request.body ?? {};
    const email = typeof correo === "string" ? correo.trim().toLowerCase() : "";
    const password = typeof contrasena === "string" ? contrasena : "";

    if (!email || !password) {
      throw badRequest("Faltan el correo o la contraseña.");
    }

    if (await isLoginBlocked({ email, ip: request.ip })) {
      await recordLoginAttempt({ email, ip: request.ip, succeeded: false });
      throw tooManyRequests(
        `Demasiados intentos fallidos. Espera ${config.login.windowMinutes} minutos e inténtalo de nuevo.`,
      );
    }

    const user = await collection("users").findOne({ email });

    // Si el usuario no existe se gasta el mismo tiempo igualmente: sin esto, la
    // duración de la respuesta delata qué correos están registrados.
    if (!user || user.disabled_at) {
      await wastePasswordTime(password);
      await recordLoginAttempt({ email, ip: request.ip, succeeded: false });
      throw unauthorized(CREDENCIALES_INVALIDAS);
    }

    if (!(await verifyPassword(password, user.password_hash))) {
      await recordLoginAttempt({ email, ip: request.ip, succeeded: false });
      await audit(request, { action: "login.fallido", entity: "user", entityId: user.id });
      throw unauthorized(CREDENCIALES_INVALIDAS);
    }

    const token = await createSession(user.id, {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    });

    await recordLoginAttempt({ email, ip: request.ip, succeeded: true });
    request.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.must_change_password,
    };
    await audit(request, { action: "login.correcto", entity: "user", entityId: user.id });

    reply.setCookie(config.session.cookieName, token, cookieOptions());
    return { usuario: usuarioPublico(request.user) };
  });

  app.post("/api/sesion/salir", async (request, reply) => {
    const token = request.cookies?.[config.session.cookieName];
    if (token) await revokeSession(token);

    await audit(request, { action: "logout", entity: "user", entityId: request.user?.id });
    reply.clearCookie(config.session.cookieName, { path: "/" });
    return { ok: true };
  });

  app.post("/api/sesion/contrasena", async (request, reply) => {
    const { actual, nueva } = request.body ?? {};

    if (typeof actual !== "string" || typeof nueva !== "string") {
      throw badRequest("Faltan la contraseña actual o la nueva.");
    }

    const problema = validatePasswordStrength(nueva);
    if (problema) throw badRequest(problema);

    const user = await collection("users").findOne(
      { id: request.user.id },
      { projection: { password_hash: 1 } },
    );
    if (!user || !(await verifyPassword(actual, user.password_hash))) {
      throw unauthorized("La contraseña actual no es correcta.");
    }

    if (await verifyPassword(nueva, user.password_hash)) {
      throw badRequest("La contraseña nueva tiene que ser distinta de la actual.");
    }

    await collection("users").updateOne(
      { id: request.user.id },
      {
        $set: {
          password_hash: await hashPassword(nueva),
          must_change_password: false,
          updated_at: new Date(),
        },
      },
    );

    // Cambiar la contraseña cierra el resto de sesiones y abre una limpia aquí:
    // si alguien tenía la sesión robada, se queda fuera.
    await revokeAllSessions(request.user.id);
    const token = await createSession(request.user.id, {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    });

    await audit(request, {
      action: "contrasena.cambiada",
      entity: "user",
      entityId: request.user.id,
    });

    reply.setCookie(config.session.cookieName, token, cookieOptions());
    return { ok: true };
  });

  app.get("/api/yo", async (request) => ({ usuario: usuarioPublico(request.user) }));
}
