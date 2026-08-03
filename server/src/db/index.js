// Acceso central a MongoDB.
//
// Los documentos conservan los nombres de campo históricos del portal
// (snake_case) y UUID en texto. Así la API no cambia durante la migración y un
// respaldo sigue siendo legible sin conocer ObjectId.

import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import { config } from "../config.js";

let client = null;
let database = null;

function requireDatabase() {
  if (!database) {
    throw new Error("MongoDB no está inicializado: llama a initDb() primero.");
  }
  return database;
}

function collectionWrapper(name, session = null) {
  const raw = requireDatabase().collection(name);
  const options = (value = {}) => (session ? { ...value, session } : value);

  return {
    raw,
    find(filter = {}, value = {}) {
      return raw.find(filter, options(value));
    },
    findOne(filter = {}, value = {}) {
      return raw.findOne(filter, options(value));
    },
    countDocuments(filter = {}, value = {}) {
      return raw.countDocuments(filter, options(value));
    },
    estimatedDocumentCount(value = {}) {
      return raw.estimatedDocumentCount(options(value));
    },
    insertOne(document, value = {}) {
      return raw.insertOne(document, options(value));
    },
    insertMany(documents, value = {}) {
      return raw.insertMany(documents, options(value));
    },
    updateOne(filter, update, value = {}) {
      return raw.updateOne(filter, update, options(value));
    },
    updateMany(filter, update, value = {}) {
      return raw.updateMany(filter, update, options(value));
    },
    findOneAndUpdate(filter, update, value = {}) {
      return raw.findOneAndUpdate(filter, update, options(value));
    },
    deleteOne(filter, value = {}) {
      return raw.deleteOne(filter, options(value));
    },
    deleteMany(filter, value = {}) {
      return raw.deleteMany(filter, options(value));
    },
    aggregate(pipeline = [], value = {}) {
      return raw.aggregate(pipeline, options(value));
    },
    bulkWrite(operations, value = {}) {
      return raw.bulkWrite(operations, options(value));
    },
  };
}

export async function initDb() {
  if (database) return database;
  const uri = process.env.MONGODB_URI ?? config.mongodbUri;
  const databaseName = process.env.MONGODB_DATABASE ?? config.mongodbDatabase;
  if (!uri) {
    throw new Error(
      "Falta MONGODB_URI. Define la cadena de conexión de MongoDB Atlas antes de arrancar.",
    );
  }

  client = new MongoClient(uri, {
    appName: "Kora Portal",
    maxPoolSize: 10,
    minPoolSize: 0,
    maxIdleTimeMS: 30_000,
    serverSelectionTimeoutMS: 15_000,
    promoteBuffers: true,
  });
  await client.connect();
  database = client.db(databaseName);
  await database.command({ ping: 1 });
  return database;
}

export function collection(name) {
  return collectionWrapper(name);
}

export function createDocument(fields = {}) {
  const now = new Date();
  const id = fields.id ?? randomUUID();
  return { _id: id, id, ...fields, created_at: fields.created_at ?? now, updated_at: fields.updated_at ?? now };
}

export function createUpsertDocument(fields = {}, omit = ["updated_at"]) {
  const document = createDocument(fields);
  for (const key of omit) delete document[key];
  return document;
}

export async function transaction(run) {
  if (!client) throw new Error("MongoDB no está inicializado.");

  const session = client.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await run({
        collection: (name) => collectionWrapper(name, session),
        session,
      });
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export async function clearDatabase() {
  const db = requireDatabase();
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  await Promise.all(
    collections
      .filter(({ name }) => !name.startsWith("system."))
      .map(({ name }) => db.collection(name).deleteMany({})),
  );
}

export async function pingDb() {
  await requireDatabase().command({ ping: 1 });
  return true;
}

export async function closeDb() {
  if (!client) return;
  await client.close();
  client = null;
  database = null;
}

export function dbKind() {
  requireDatabase();
  return "mongodb";
}
