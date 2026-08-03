// Freno a la fuerza bruta en el login, contado por correo y por IP.

import { config } from "../config.js";
import { collection, createDocument } from "../db/index.js";

export async function recordLoginAttempt({ email, ip, succeeded }) {
  await collection("login_attempts").insertOne(
    createDocument({
      email: (email ?? "").toLowerCase(),
      ip: ip ?? "desconocida",
      succeeded,
      at: new Date(),
    }),
  );
}

export async function isLoginBlocked({ email, ip }) {
  const { maxAttempts, windowMinutes } = config.login;
  const attempts = collection("login_attempts");
  const desde = new Date(Date.now() - windowMinutes * 60_000);
  const normalizedEmail = (email ?? "").toLowerCase();
  const normalizedIp = ip ?? "desconocida";

  const [ultimoCorreoCorrecto, ultimoIpCorrecto] = await Promise.all([
    attempts.findOne(
      { email: normalizedEmail, succeeded: true },
      { sort: { at: -1 }, projection: { at: 1 } },
    ),
    attempts.findOne(
      { ip: normalizedIp, succeeded: true },
      { sort: { at: -1 }, projection: { at: 1 } },
    ),
  ]);

  const [porCorreo, porIp] = await Promise.all([
    attempts.countDocuments({
      email: normalizedEmail,
      succeeded: false,
      at: { $gt: ultimoCorreoCorrecto?.at > desde ? ultimoCorreoCorrecto.at : desde },
    }),
    attempts.countDocuments({
      ip: normalizedIp,
      succeeded: false,
      at: { $gt: ultimoIpCorrecto?.at > desde ? ultimoIpCorrecto.at : desde },
    }),
  ]);

  return porCorreo >= maxAttempts || porIp >= maxAttempts * 3;
}

export async function purgeOldLoginAttempts() {
  const result = await collection("login_attempts").deleteMany({
    at: { $lt: new Date(Date.now() - 90 * 86_400_000) },
  });
  return result.deletedCount;
}
