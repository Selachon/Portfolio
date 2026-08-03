// Creación del primer usuario.
//
// El plan gratuito de Render no da consola, así que el dueño no se puede crear
// a mano con un script. Se crea en el primer arranque a partir de dos variables
// de entorno, con la contraseña marcada como temporal: al entrar, el portal
// obliga a cambiarla. Después de eso, las variables se pueden borrar de Render.
//
// Solo actúa si la tabla de usuarios está vacía: no puede pisar una cuenta ya
// existente ni reactivar nada.

import { collection, createDocument } from "../db/index.js";
import { config } from "../config.js";
import { hashPassword, validatePasswordStrength } from "./password.js";

export async function bootstrapOwner({ log = console.log } = {}) {
  const users = collection("users");
  if ((await users.estimatedDocumentCount()) > 0) return { creado: false, motivo: "ya-hay-usuarios" };

  const { email, password, name } = config.bootstrap;

  if (!email || !password) {
    log(
      "⚠ No hay ningún usuario todavía. Define BOOTSTRAP_OWNER_EMAIL y " +
        "BOOTSTRAP_OWNER_PASSWORD para crear la cuenta del propietario.",
    );
    return { creado: false, motivo: "faltan-variables" };
  }

  const problema = validatePasswordStrength(password);
  if (problema) {
    throw new Error(`BOOTSTRAP_OWNER_PASSWORD no es válida: ${problema}`);
  }

  const normalizado = email.trim().toLowerCase();
  const creado = createDocument({
    email: normalizado,
    name,
    password_hash: await hashPassword(password),
    role: "owner",
    must_change_password: true,
    totp_secret: null,
    disabled_at: null,
  });
  await users.insertOne(creado);
  log(`✓ Propietario creado: ${normalizado} (tendrá que cambiar la contraseña al entrar).`);

  return { creado: true, id: creado.id, email: normalizado };
}
