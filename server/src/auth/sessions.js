// Sesiones opacas guardadas en MongoDB. El navegador solo conoce el token en
// claro; Atlas conserva exclusivamente su sha256.

import { createHash, randomBytes } from "node:crypto";
import { config } from "../config.js";
import { collection, createDocument } from "../db/index.js";

const TOKEN_BYTES = 32;

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId, { ip, userAgent } = {}) {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const now = new Date();
  await collection("sessions").insertOne(
    createDocument({
      user_id: userId,
      token_hash: hashToken(token),
      created_at: now,
      last_seen_at: now,
      expires_at: new Date(now.getTime() + config.session.lifetimeDays * 86_400_000),
      revoked_at: null,
      ip: ip ?? null,
      user_agent: userAgent ?? null,
    }),
  );
  return token;
}

export async function resolveSession(token) {
  if (typeof token !== "string" || token.length < 20) return null;

  const sessions = collection("sessions");
  const row = await sessions.findOne({
    token_hash: hashToken(token),
    revoked_at: null,
    expires_at: { $gt: new Date() },
  });
  if (!row) return null;

  const user = await collection("users").findOne({ id: row.user_id, disabled_at: null });
  if (!user) return null;

  const remainingMs = row.expires_at.getTime() - Date.now();
  const halfLifeMs = (config.session.lifetimeDays * 86_400_000) / 2;
  const update = { last_seen_at: new Date() };
  if (remainingMs < halfLifeMs) {
    update.expires_at = new Date(Date.now() + config.session.lifetimeDays * 86_400_000);
  }
  await sessions.updateOne({ id: row.id }, { $set: update });

  return {
    sessionId: row.id,
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    mustChangePassword: user.must_change_password,
  };
}

export async function revokeSession(token) {
  if (typeof token !== "string") return;
  await collection("sessions").updateOne(
    { token_hash: hashToken(token) },
    { $set: { revoked_at: new Date(), updated_at: new Date() } },
  );
}

export async function revokeAllSessions(userId) {
  await collection("sessions").updateMany(
    { user_id: userId, revoked_at: null },
    { $set: { revoked_at: new Date(), updated_at: new Date() } },
  );
}

export async function purgeExpiredSessions() {
  const result = await collection("sessions").deleteMany({
    expires_at: { $lt: new Date(Date.now() - 30 * 86_400_000) },
  });
  return result.deletedCount;
}
