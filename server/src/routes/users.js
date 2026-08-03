// Gestión de usuarios: solo el propietario.

import { randomBytes } from "node:crypto";
import { audit } from "../audit.js";
import { collection, createDocument } from "../db/index.js";
import { badRequest, conflict, forbidden, notFound } from "../http/errors.js";
import { requireRole } from "../auth/guard.js";
import { hashPassword } from "../auth/password.js";
import { revokeAllSessions } from "../auth/sessions.js";

const ROLES = new Set(["owner", "advisor"]);
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generarContrasenaTemporal() {
  return `kora-${randomBytes(12).toString("base64url")}-26`;
}

function usuarioPublico(fila) {
  return {
    id: fila.id,
    correo: fila.email,
    nombre: fila.name,
    rol: fila.role,
    activo: fila.disabled_at === null,
    debeCambiarContrasena: fila.must_change_password,
    creadoEn: fila.created_at,
  };
}

export default async function userRoutes(app) {
  const soloPropietario = { preHandler: requireRole("owner") };
  const users = collection("users");

  app.get("/api/usuarios", soloPropietario, async () => {
    const rows = await users.find({}).sort({ created_at: 1 }).toArray();
    return { usuarios: rows.map(usuarioPublico) };
  });

  app.post("/api/usuarios", soloPropietario, async (request) => {
    const { correo, nombre, rol = "advisor" } = request.body ?? {};
    const email = typeof correo === "string" ? correo.trim().toLowerCase() : "";
    const name = typeof nombre === "string" ? nombre.trim() : "";

    if (!CORREO_VALIDO.test(email)) throw badRequest("El correo no es válido.");
    if (name.length < 2) throw badRequest("Falta el nombre de la persona.");
    if (!ROLES.has(rol)) throw badRequest("El rol tiene que ser 'owner' o 'advisor'.");
    if (await users.findOne({ email })) throw conflict("Ya hay una cuenta con ese correo.");

    const contrasenaTemporal = generarContrasenaTemporal();
    const user = createDocument({
      email,
      name,
      password_hash: await hashPassword(contrasenaTemporal),
      role: rol,
      must_change_password: true,
      totp_secret: null,
      disabled_at: null,
    });
    await users.insertOne(user);

    await audit(request, {
      action: "usuario.creado",
      entity: "user",
      entityId: user.id,
      meta: { correo: email, rol },
    });

    return {
      usuario: usuarioPublico(user),
      contrasenaTemporal,
      aviso:
        "Pásale esta contraseña por un canal privado. No se puede volver a consultar; " +
        "si se pierde, genera una nueva.",
    };
  });

  app.post("/api/usuarios/:id/contrasena-temporal", soloPropietario, async (request) => {
    const usuario = await users.findOne({ id: request.params.id });
    if (!usuario) throw notFound("Ese usuario no existe.");

    const contrasenaTemporal = generarContrasenaTemporal();
    await users.updateOne(
      { id: usuario.id },
      {
        $set: {
          password_hash: await hashPassword(contrasenaTemporal),
          must_change_password: true,
          updated_at: new Date(),
        },
      },
    );
    await revokeAllSessions(usuario.id);
    await audit(request, { action: "usuario.contrasena-reiniciada", entity: "user", entityId: usuario.id });
    return { contrasenaTemporal };
  });

  app.patch("/api/usuarios/:id", soloPropietario, async (request) => {
    const { activo, nombre, rol } = request.body ?? {};
    const usuario = await users.findOne({ id: request.params.id });
    if (!usuario) throw notFound("Ese usuario no existe.");

    if (usuario.id === request.user.id && (activo === false || (rol && rol !== "owner"))) {
      throw forbidden("No puedes desactivar ni degradar tu propia cuenta de propietario.");
    }
    if (rol !== undefined && !ROLES.has(rol)) {
      throw badRequest("El rol tiene que ser 'owner' o 'advisor'.");
    }

    const cambios = { updated_at: new Date() };
    if (typeof nombre === "string" && nombre.trim()) cambios.name = nombre.trim();
    if (rol !== undefined) cambios.role = rol;
    if (activo !== undefined) cambios.disabled_at = activo ? null : (usuario.disabled_at ?? new Date());

    const updated = await users.findOneAndUpdate(
      { id: usuario.id },
      { $set: cambios },
      { returnDocument: "after" },
    );
    if (activo === false) await revokeAllSessions(usuario.id);

    await audit(request, {
      action: "usuario.actualizado",
      entity: "user",
      entityId: usuario.id,
      meta: { activo, rol, nombre },
    });
    return { usuario: usuarioPublico(updated) };
  });

  app.get("/api/auditoria", soloPropietario, async (request) => {
    const limite = Math.min(Number.parseInt(request.query?.limite ?? "100", 10) || 100, 500);
    const rows = await collection("audit_log").find({}).sort({ at: -1 }).limit(limite).toArray();
    const ids = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
    const autores = ids.length
      ? await users.find({ id: { $in: ids } }, { projection: { id: 1, email: 1, name: 1 } }).toArray()
      : [];
    const porId = new Map(autores.map((user) => [user.id, user]));

    return {
      eventos: rows.map((fila) => {
        const autor = porId.get(fila.user_id);
        return {
          id: fila.id,
          accion: fila.action,
          entidad: fila.entity,
          entidadId: fila.entity_id,
          detalles: fila.meta,
          fecha: fila.at,
          autor: autor ? { correo: autor.email, nombre: autor.name } : null,
        };
      }),
    };
  });
}
