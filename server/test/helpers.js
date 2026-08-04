// Cada archivo de pruebas levanta un replica set MongoDB efímero. Así se prueban
// las mismas agregaciones, índices y transacciones que usa Atlas en producción.

import { after } from "node:test";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = mongo.getUri();
process.env.MONGODB_DATABASE = "kora_test";
process.env.PASSWORD_COST_LOG2 = "12";
process.env.SESSION_SECURE_COOKIE = "false";
process.env.PROXMOX_INGEST_TOKEN = "token-de-prueba-proxmox-32-caracteres-seguro";

const { buildApp } = await import("../src/app.js");
const { clearDatabase, closeDb, collection, createDocument, initDb } = await import("../src/db/index.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { hashPassword } = await import("../src/auth/password.js");

export { collection };

after(async () => {
  await closeDb();
  await mongo.stop();
});

export async function crearApp() {
  await initDb();
  await runMigrations({ log: () => {} });
  await clearDatabase();
  const app = await buildApp({ logger: false });
  await app.ready();
  return app;
}

export async function cerrarApp(app) {
  await app.close();
  await closeDb();
}

export async function crearUsuario({
  email,
  password = "contrasena-de-prueba-1",
  role = "owner",
  name = "Prueba",
  mustChangePassword = false,
} = {}) {
  const user = createDocument({
    email,
    name,
    password_hash: await hashPassword(password),
    role,
    must_change_password: mustChangePassword,
    totp_secret: null,
    disabled_at: null,
  });
  await collection("users").insertOne(user);
  return user.id;
}

export async function iniciarSesion(app, correo, contrasena = "contrasena-de-prueba-1") {
  const respuesta = await app.inject({
    method: "POST",
    url: "/api/sesion/entrar",
    payload: { correo, contrasena },
  });

  if (respuesta.statusCode !== 200) {
    throw new Error(`El login falló (${respuesta.statusCode}): ${respuesta.body}`);
  }

  const cookie = respuesta.cookies.find((c) => c.name === "kora_sesion");
  return { cookie: `kora_sesion=${cookie.value}`, respuesta };
}
