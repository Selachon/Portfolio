// MongoDB no necesita migraciones de esquema para crear colecciones, pero sí
// índices que hagan cumplir las invariantes de unicidad e integridad.

import { fileURLToPath } from "node:url";
import { closeDb, collection, initDb } from "./index.js";

const DEFINITIONS = [
  ["users", { email: 1 }, { unique: true, name: "users_email_unique" }],
  ["sessions", { token_hash: 1 }, { unique: true, name: "sessions_token_unique" }],
  ["sessions", { user_id: 1 }, { name: "sessions_user" }],
  ["sessions", { expires_at: 1 }, { name: "sessions_expires" }],
  ["login_attempts", { email: 1, at: -1 }, { name: "login_attempts_email" }],
  ["login_attempts", { ip: 1, at: -1 }, { name: "login_attempts_ip" }],
  ["accounts", { name: 1 }, { unique: true, name: "accounts_name_unique", collation: { locale: "es", strength: 2 } }],
  ["statements", { account_id: 1, sha256: 1 }, { unique: true, name: "statements_account_hash_unique" }],
  ["statements", { period_year: -1, period_month: -1 }, { name: "statements_period" }],
  ["movements", { account_id: 1, dedupe_key: 1 }, { unique: true, name: "movements_dedupe_unique" }],
  ["movements", { account_id: 1, dedupe_base: 1 }, { name: "movements_duplicate_candidates" }],
  ["movements", { account_id: 1, occurred_on: -1 }, { name: "movements_account_date" }],
  ["movements", { occurred_on: -1 }, { name: "movements_date" }],
  ["movements", { statement_id: 1 }, { name: "movements_statement", sparse: true }],
  ["movements", { category: 1 }, { name: "movements_category", sparse: true }],
  ["category_rules", { priority: 1, id: 1 }, { name: "category_rules_priority" }],
  ["reports", { period_year: 1, period_month: 1, currency: 1 }, { unique: true, name: "reports_period_unique" }],
  ["budget_periods", { budget_item_id: 1, period_year: 1, period_month: 1 }, { unique: true, name: "budget_periods_unique" }],
  ["debts", { active: -1, concept: 1 }, { name: "debts_active_concept" }],
  ["debt_payments", { debt_id: 1, paid_on: -1 }, { name: "debt_payments_debt_date" }],
  ["audit_log", { at: -1 }, { name: "audit_date" }],
  ["audit_log", { entity: 1, entity_id: 1 }, { name: "audit_entity" }],
  ["fx_rates", { fecha: 1, base: 1, cotizada: 1 }, { unique: true, name: "fx_rates_unique" }],
  ["fx_rates", { fecha: -1 }, { name: "fx_rates_date" }],
  ["proxmox_state", { agent_id: 1 }, { unique: true, name: "proxmox_state_agent_unique" }],
  ["proxmox_samples", { agent_id: 1, captured_at: -1 }, { name: "proxmox_samples_agent_date" }],
  ["proxmox_samples", { expires_at: 1 }, { expireAfterSeconds: 0, name: "proxmox_samples_ttl" }],
  ["proxmox_rollups", { agent_id: 1, bucket_at: 1 }, { unique: true, name: "proxmox_rollups_bucket_unique" }],
  ["proxmox_rollups", { expires_at: 1 }, { expireAfterSeconds: 0, name: "proxmox_rollups_ttl" }],
  ["proxmox_hourly", { agent_id: 1, bucket_at: 1 }, { unique: true, name: "proxmox_hourly_bucket_unique" }],
  ["proxmox_hourly", { expires_at: 1 }, { expireAfterSeconds: 0, name: "proxmox_hourly_ttl" }],
  ["proxmox_daily", { agent_id: 1, bucket_at: 1 }, { unique: true, name: "proxmox_daily_bucket_unique" }],
  ["proxmox_daily", { expires_at: 1 }, { expireAfterSeconds: 0, name: "proxmox_daily_ttl" }],
  ["proxmox_events", { agent_id: 1, at: -1 }, { name: "proxmox_events_agent_date" }],
  ["proxmox_events", { event_key: 1 }, { unique: true, sparse: true, name: "proxmox_events_key_unique" }],
  ["proxmox_events", { expires_at: 1 }, { expireAfterSeconds: 0, name: "proxmox_events_ttl" }],
];

/**
 * Pone al día las deudas creadas antes de que existieran los abonos libres.
 *
 * Aquellas solo guardaban cuántas cuotas iban pagadas y deducían el saldo por
 * regla de tres. Ahora manda `paid_cents`, así que se rellena con lo que ya
 * estaba implícito —capital menos saldo— y la cifra en pantalla no se mueve ni
 * un centavo. Es idempotente: solo toca los documentos a los que les falta.
 */
async function adaptarDeudasAntiguas() {
  const debts = collection("debts");
  const pendientes = await debts.find({ kind: { $exists: false } }).toArray();

  for (const debt of pendientes) {
    const principal = Number(debt.principal_cents ?? 0);
    const restante = Number(debt.remaining_cents ?? principal);
    const abonado = Math.max(0, principal - restante);

    await debts.updateOne(
      { id: debt.id },
      {
        $set: {
          kind: "cuotas",
          paid_cents: abonado,
          remaining_cents: Math.max(0, principal - abonado),
          settled_at: restante === 0 ? (debt.settled_at ?? debt.updated_at ?? new Date()) : null,
        },
      },
    );
  }

  return pendientes.length;
}

export async function runMigrations({ log = console.log } = {}) {
  for (const [name, keys, options] of DEFINITIONS) {
    await collection(name).raw.createIndex(keys, options);
  }

  const adaptadas = await adaptarDeudasAntiguas();
  if (adaptadas > 0) log(`✓ ${adaptadas} deuda(s) adaptadas al historial de abonos.`);

  log(`MongoDB preparado: ${DEFINITIONS.length} índices verificados.`);
  return DEFINITIONS.length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await initDb();
    await runMigrations();
  } finally {
    await closeDb();
  }
}
