// Migración única desde la base PGlite local a MongoDB Atlas.
//
// Uso:
//   PGLITE_DIR=./.pglite MONGODB_URI='mongodb+srv://...' \
//     node scripts/migrar-pglite-mongodb.js --replace

import { PGlite } from "@electric-sql/pglite";
import { MongoClient } from "mongodb";

const SOURCE_DIR = process.env.PGLITE_DIR ?? "./.pglite";
const URI = process.env.MONGODB_URI;
const DATABASE = process.env.MONGODB_DATABASE ?? "kora";
const REPLACE = process.argv.includes("--replace");

if (!URI) throw new Error("Falta MONGODB_URI.");

const TABLES = [
  "users",
  "accounts",
  "statements",
  "movements",
  "category_rules",
  "reports",
  "budget_items",
  "budget_periods",
  "debts",
  "receivables",
  "audit_log",
  "fx_rates",
];

const DATE_ONLY_FIELDS = new Set(["occurred_on", "paid_on", "fecha"]);
const JSON_FIELDS = new Set(["parse_warnings", "totals", "meta"]);

function normalizeValue(value, field) {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") {
    const number = Number(value);
    if (!Number.isSafeInteger(number)) throw new Error(`${field} supera el rango seguro de JavaScript.`);
    return number;
  }
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (value instanceof Date) return DATE_ONLY_FIELDS.has(field) ? value.toISOString().slice(0, 10) : value;
  if (Array.isArray(value)) return value.map((item) => normalizeValue(item, field));
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeValue(item, key)]));
  }
  if (JSON_FIELDS.has(field) && typeof value === "string") {
    try {
      return normalizeValue(JSON.parse(value), field);
    } catch {
      return value;
    }
  }
  if (DATE_ONLY_FIELDS.has(field)) return String(value).slice(0, 10);
  return value;
}

function documentId(table, row) {
  if (row.id !== undefined && row.id !== null) return String(row.id);
  if (table === "budget_periods") return `${row.budget_item_id}:${row.period_year}:${row.period_month}`;
  if (table === "fx_rates") return `${row.fecha}:${row.base}:${row.cotizada}`;
  throw new Error(`No se pudo construir _id para ${table}.`);
}

const source = new PGlite(SOURCE_DIR);
const target = new MongoClient(URI, { appName: "Kora PGlite migration" });

try {
  await source.waitReady;
  const exported = new Map();
  for (const table of TABLES) {
    const { rows } = await source.query(`select * from ${table}`);
    exported.set(table, rows.map((row) => {
      const document = Object.fromEntries(
        Object.entries(row).map(([field, value]) => [field, normalizeValue(value, field)]),
      );
      document._id = documentId(table, document);
      return document;
    }));
  }

  await target.connect();
  const db = target.db(DATABASE);
  await db.command({ ping: 1 });

  const existing = await Promise.all(TABLES.map((table) => db.collection(table).estimatedDocumentCount()));
  const existingTotal = existing.reduce((sum, count) => sum + count, 0);
  if (existingTotal > 0 && !REPLACE) {
    throw new Error(
      `La base destino ya tiene ${existingTotal} documentos. Revisa el destino y usa --replace para sustituirlos.`,
    );
  }

  const session = target.startSession();
  try {
    await session.withTransaction(async () => {
      for (const table of [...TABLES, "sessions", "login_attempts"]) {
        await db.collection(table).deleteMany({}, { session });
      }
      for (const [table, documents] of exported) {
        if (documents.length) await db.collection(table).insertMany(documents, { session, ordered: true });
      }
    });
  } finally {
    await session.endSession();
  }

  const result = {};
  for (const [table, documents] of exported) {
    const count = await db.collection(table).estimatedDocumentCount();
    if (count !== documents.length) {
      throw new Error(`${table}: se esperaban ${documents.length} documentos y MongoDB tiene ${count}.`);
    }
    result[table] = count;
  }

  console.log(JSON.stringify({ ok: true, database: DATABASE, collections: result }, null, 2));
} finally {
  await source.close();
  await target.close();
}
