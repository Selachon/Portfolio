// Errores de la API con un formato único: { error: { mensaje, detalles } }.
// Cualquier error que no sea un ApiError se responde como 500 genérico, para no
// filtrar rutas de archivos ni SQL al navegador.

export class ApiError extends Error {
  constructor(statusCode, mensaje, detalles = null) {
    super(mensaje);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.detalles = detalles;
  }
}

export const badRequest = (mensaje, detalles) => new ApiError(400, mensaje, detalles);
export const unauthorized = (mensaje = "Necesitas iniciar sesión.") => new ApiError(401, mensaje);
export const forbidden = (mensaje = "No tienes permiso para hacer esto.") => new ApiError(403, mensaje);
export const notFound = (mensaje = "No se encontró el recurso.") => new ApiError(404, mensaje);
export const conflict = (mensaje, detalles) => new ApiError(409, mensaje, detalles);
export const tooManyRequests = (mensaje) => new ApiError(429, mensaje);

export function registerErrorHandler(app) {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) {
      return reply.code(error.statusCode).send({
        error: { mensaje: error.message, detalles: error.detalles ?? undefined },
      });
    }

    // Errores de validación del propio Fastify (esquemas de ruta).
    if (error.validation) {
      return reply.code(400).send({
        error: { mensaje: "Los datos enviados no son válidos.", detalles: error.message },
      });
    }

    if (error.statusCode === 413) {
      return reply.code(413).send({ error: { mensaje: "El archivo es demasiado grande." } });
    }

    // Errores del propio Fastify por una petición mal formada (cuerpo vacío con
    // content-type JSON, JSON inválido...). Son culpa de quien llama, no del
    // servidor, así que no deben salir como 500.
    if (Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode < 500) {
      request.log.warn({ err: error }, "petición mal formada");
      return reply.code(error.statusCode).send({
        error: { mensaje: "La petición no es válida.", detalles: error.message },
      });
    }

    request.log.error({ err: error }, "error no controlado");
    return reply.code(500).send({ error: { mensaje: "Error interno del servidor." } });
  });
}
