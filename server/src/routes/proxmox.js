import { timingSafeEqual } from "node:crypto";
import { config } from "../config.js";
import { collection } from "../db/index.js";
import { crearAlertas, crearEventos, crearMuestra, normalizarSnapshot } from "../domain/proxmox.js";
import { ApiError, badRequest, unauthorized } from "../http/errors.js";

const RANGOS = new Map([
  ["1h", 1],
  ["6h", 6],
  ["24h", 24],
  ["7d", 24 * 7],
  ["30d", 24 * 30],
  ["90d", 24 * 90],
  ["1a", 24 * 365],
]);

function tokenValido(header) {
  if (!config.proxmox.ingestToken || typeof header !== "string") return false;
  const recibido = Buffer.from(header);
  const esperado = Buffer.from(`Bearer ${config.proxmox.ingestToken}`);
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}

function rango(request) {
  const clave = String(request.query?.rango ?? "24h");
  const horas = RANGOS.get(clave);
  if (!horas) throw badRequest("El rango debe ser 1h, 6h, 24h, 7d, 30d, 90d o 1a.");
  return { clave, horas };
}

function limpiarDocumento(documento) {
  if (!documento) return null;
  const salida = { ...documento };
  delete salida._id;
  delete salida.expires_at;
  return salida;
}

function reducirPuntos(puntos, maximo = 260) {
  if (puntos.length <= maximo) return puntos;
  const paso = puntos.length / maximo;
  return Array.from({ length: maximo }, (_, indice) => puntos[Math.floor(indice * paso)]);
}

async function obtenerEstado() {
  return collection("proxmox_state").findOne({}, { sort: { received_at: -1 } });
}

async function obtenerMuestras(agentId, horas) {
  const desde = new Date(Date.now() - horas * 3_600_000);
  const usarCrudas = horas <= 6;
  const nombre = usarCrudas
    ? "proxmox_samples"
    : horas <= 24 * 7
      ? "proxmox_rollups"
      : horas <= 24 * 90 ? "proxmox_hourly" : "proxmox_daily";
  const campoFecha = usarCrudas ? "captured_at" : "bucket_at";
  const documentos = await collection(nombre)
    .find(
      { agent_id: agentId, [campoFecha]: { $gte: desde } },
      { projection: { _id: 0, sample: 1, captured_at: 1, bucket_at: 1 }, sort: { [campoFecha]: 1 }, limit: 4_000 },
    )
    .toArray();
  return reducirPuntos(documentos.map((documento) => ({
    at: documento.captured_at ?? documento.bucket_at,
    ...documento.sample,
  })));
}

async function guardarEventos(eventos) {
  for (const evento of eventos) {
    try {
      await collection("proxmox_events").insertOne(evento);
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
  }
}

async function guardarAgregado(nombre, snapshot, sample, bucketMs, expiresAt, receivedAt) {
  const bucketAt = new Date(Math.floor(snapshot.capturedAt.getTime() / bucketMs) * bucketMs);
  await collection(nombre).updateOne(
    { agent_id: snapshot.agentId, bucket_at: bucketAt },
    {
      $set: { sample, captured_at: snapshot.capturedAt, updated_at: receivedAt, expires_at: expiresAt },
      $setOnInsert: { agent_id: snapshot.agentId, bucket_at: bucketAt, created_at: receivedAt },
    },
    { upsert: true },
  );
}

export default async function proxmoxRoutes(app) {
  app.post("/api/infraestructura/ingesta", {
    // onRequest corre antes de parsear el JSON: una petición sin token no puede
    // obligar al servidor a procesar un cuerpo grande.
    onRequest: async (request) => {
      if (!config.proxmox.ingestToken) {
        throw new ApiError(503, "La ingesta de infraestructura no está configurada.");
      }
      if (!tokenValido(request.headers.authorization)) throw unauthorized("Token del colector inválido.");
    },
  }, async (request, reply) => {

    let snapshot;
    try {
      snapshot = normalizarSnapshot(request.body);
    } catch (error) {
      throw badRequest(error.message);
    }

    const states = collection("proxmox_state");
    const anterior = await states.findOne({ agent_id: snapshot.agentId });
    if (anterior && new Date(anterior.snapshot.capturedAt) >= snapshot.capturedAt) {
      return reply.code(202).send({ ok: true, duplicate: true });
    }

    const receivedAt = new Date();
    const rawExpiresAt = new Date(receivedAt.getTime() + config.proxmox.rawRetentionDays * 86_400_000);
    const rollupExpiresAt = new Date(receivedAt.getTime() + config.proxmox.rollupRetentionDays * 86_400_000);
    const historyExpiresAt = new Date(receivedAt.getTime() + config.proxmox.historyRetentionDays * 86_400_000);
    const sample = crearMuestra(snapshot, anterior);

    await collection("proxmox_samples").insertOne({
      agent_id: snapshot.agentId,
      captured_at: snapshot.capturedAt,
      received_at: receivedAt,
      expires_at: rawExpiresAt,
      sample,
    });
    await Promise.all([
      guardarAgregado("proxmox_rollups", snapshot, sample, 5 * 60_000, rollupExpiresAt, receivedAt),
      guardarAgregado("proxmox_hourly", snapshot, sample, 60 * 60_000, historyExpiresAt, receivedAt),
      guardarAgregado("proxmox_daily", snapshot, sample, 24 * 60 * 60_000, historyExpiresAt, receivedAt),
    ]);
    await states.updateOne(
      { agent_id: snapshot.agentId },
      {
        $set: { snapshot, sample, received_at: receivedAt, updated_at: receivedAt },
        $setOnInsert: { agent_id: snapshot.agentId, created_at: receivedAt },
      },
      { upsert: true },
    );

    await guardarEventos(crearEventos(snapshot, anterior, receivedAt, historyExpiresAt));
    return reply.code(202).send({ ok: true, capturedAt: snapshot.capturedAt });
  });

  app.get("/api/infraestructura/resumen", async (request) => {
    const { clave, horas } = rango(request);
    const state = await obtenerEstado();
    if (!state) {
      return {
        configured: Boolean(config.proxmox.ingestToken),
        connected: false,
        range: clave,
        state: null,
        history: [],
        alerts: [],
        events: [],
      };
    }

    const edadSegundos = Math.max(
      0,
      (Date.now() - new Date(state.received_at)) / 1_000,
      (Date.now() - new Date(state.snapshot.capturedAt)) / 1_000,
    );
    const [history, events] = await Promise.all([
      obtenerMuestras(state.agent_id, horas),
      collection("proxmox_events")
        .find({ agent_id: state.agent_id }, { projection: { _id: 0, expires_at: 0 }, sort: { at: -1 }, limit: 30 })
        .toArray(),
    ]);

    return {
      configured: Boolean(config.proxmox.ingestToken),
      connected: edadSegundos <= config.proxmox.staleAfterSeconds,
      staleAfterSeconds: config.proxmox.staleAfterSeconds,
      ageSeconds: Math.round(edadSegundos),
      range: clave,
      state: limpiarDocumento(state),
      history: history.map((punto) => ({ at: punto.at, node: punto.node })),
      alerts: crearAlertas(state, { staleAfterSeconds: config.proxmox.staleAfterSeconds }),
      events,
    };
  });

  app.get("/api/infraestructura/invitados/:type/:vmid/historial", async (request) => {
    const { horas, clave } = rango(request);
    const type = String(request.params.type).toLowerCase();
    const vmid = Number.parseInt(request.params.vmid, 10);
    if (!new Set(["lxc", "qemu"]).has(type) || !Number.isInteger(vmid)) {
      throw badRequest("El identificador del invitado no es válido.");
    }

    const state = await obtenerEstado();
    if (!state) return { range: clave, guest: null, history: [] };
    const id = `${type}/${vmid}`;
    const guest = state.snapshot.guests.find((item) => item.id === id) ?? null;
    const muestras = await obtenerMuestras(state.agent_id, horas);
    return {
      range: clave,
      guest,
      history: muestras
        .map((muestra) => ({ at: muestra.at, ...muestra.guests.find((item) => item.id === id) }))
        .filter((muestra) => muestra.id),
    };
  });
}
