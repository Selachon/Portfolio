// Guardas de acceso.
//
// El portal es cerrado por defecto: `requireAuth` se aplica a todo /api salvo a
// una lista corta y explícita de rutas públicas (login y estado del servicio).
// Así, una ruta nueva nace protegida aunque a quien la escriba se le olvide.

import { config } from "../config.js";
import { resolveSession } from "./sessions.js";
import { forbidden, unauthorized } from "../http/errors.js";

// Únicas rutas de la API que se pueden tocar sin sesión.
const RUTAS_PUBLICAS = new Set([
  "/api/salud",
  "/api/sesion/entrar",
  "/api/sesion/estado",
  // Esta ruta aplica su propia autenticación de máquina con un secreto largo.
  "/api/infraestructura/ingesta",
]);

function esRutaPublica(url) {
  const ruta = url.split("?")[0];
  return RUTAS_PUBLICAS.has(ruta);
}

export function registerAuthGuard(app) {
  // Deja el usuario disponible en todas las peticiones que traigan sesión.
  app.decorateRequest("user", null);

  app.addHook("onRequest", async (request) => {
    const token = request.cookies?.[config.session.cookieName];
    if (!token) return;

    try {
      request.user = await resolveSession(token);
    } catch (error) {
      request.log.error({ err: error }, "no se pudo resolver la sesión");
    }
  });

  // Cierra /api entero salvo las rutas públicas declaradas arriba.
  app.addHook("preHandler", async (request) => {
    if (!request.url.startsWith("/api/")) return;
    if (esRutaPublica(request.url)) return;
    if (!request.user) throw unauthorized();

    // Con contraseña temporal solo se puede cambiar la contraseña o salir.
    const rutasPermitidasSinCambiar = new Set([
      "/api/sesion/salir",
      "/api/sesion/estado",
      "/api/sesion/contrasena",
      "/api/yo",
    ]);
    if (
      request.user.mustChangePassword &&
      !rutasPermitidasSinCambiar.has(request.url.split("?")[0])
    ) {
      throw forbidden("Tienes que cambiar tu contraseña temporal antes de seguir.");
    }
  });
}

/** preHandler que exige un rol concreto. Úsalo como `preHandler: requireRole("owner")`. */
export function requireRole(...roles) {
  return async function verificarRol(request) {
    if (!request.user) throw unauthorized();
    if (!roles.includes(request.user.role)) {
      throw forbidden("Esta acción es solo para el propietario de la cuenta.");
    }
  };
}
