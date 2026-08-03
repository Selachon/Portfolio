// Reglas de categoría: lo que convierte "Compra no presencial nacional" en una
// línea del pivot sin que nadie la teclee cada mes.

import { audit } from "../audit.js";
import { collection, createDocument, transaction } from "../db/index.js";
import { badRequest, notFound } from "../http/errors.js";
import { requireRole } from "../auth/guard.js";
import { clasificar } from "../domain/categories.js";
import { cargarReglas } from "../repos/movements.js";

const TIPOS_COINCIDENCIA = new Set(["contiene", "igual", "empieza", "regex"]);

function reglaPublica(fila) {
  return {
    id: fila.id,
    patron: fila.pattern,
    tipo: fila.match_type,
    categoria: fila.category,
    sentido: fila.direction,
    prioridad: fila.priority,
    activa: fila.active,
  };
}

function validarRegla({ patron, tipo, categoria }) {
  if (typeof patron !== "string" || !patron.trim()) return "La regla necesita un patrón.";
  if (typeof categoria !== "string" || !categoria.trim()) return "La regla necesita una categoría.";
  if (tipo !== undefined && !TIPOS_COINCIDENCIA.has(tipo)) {
    return "El tipo debe ser contiene, igual, empieza o regex.";
  }
  if (tipo === "regex") {
    try {
      new RegExp(patron);
    } catch {
      return "La expresión regular no es válida.";
    }
  }
  return null;
}

export default async function categoryRuleRoutes(app) {
  app.get("/api/reglas", async () => {
    const rows = await collection("category_rules").find({}).sort({ priority: 1, id: 1 }).toArray();
    return { reglas: rows.map(reglaPublica) };
  });

  app.post("/api/reglas", async (request) => {
    const { patron, tipo = "contiene", categoria, sentido = null, prioridad = 100 } = request.body ?? {};

    const problema = validarRegla({ patron, tipo, categoria });
    if (problema) throw badRequest(problema);

    const rule = createDocument({
      pattern: patron.trim(),
      match_type: tipo,
      category: categoria.trim(),
      direction: sentido || null,
      priority: Number(prioridad) || 100,
      active: true,
    });
    await collection("category_rules").insertOne(rule);

    await audit(request, { action: "regla.creada", entity: "category_rule", entityId: rule.id, meta: { patron, categoria } });
    return { regla: reglaPublica(rule) };
  });

  app.patch("/api/reglas/:id", async (request) => {
    const { patron, tipo, categoria, sentido, prioridad, activa } = request.body ?? {};

    const rules = collection("category_rules");
    const regla = await rules.findOne({ id: request.params.id });
    if (!regla) throw notFound("Esa regla no existe.");

    if (patron !== undefined || categoria !== undefined || tipo !== undefined) {
      const problema = validarRegla({
        patron: patron ?? regla.pattern,
        tipo: tipo ?? regla.match_type,
        categoria: categoria ?? regla.category,
      });
      if (problema) throw badRequest(problema);
    }

    const cambios = { updated_at: new Date() };
    if (typeof patron === "string" && patron.trim()) cambios.pattern = patron.trim();
    if (tipo !== undefined) cambios.match_type = tipo;
    if (typeof categoria === "string" && categoria.trim()) cambios.category = categoria.trim();
    if (sentido !== undefined) cambios.direction = sentido ? String(sentido) : null;
    if (prioridad !== undefined) cambios.priority = Number(prioridad);
    if (activa !== undefined) cambios.active = Boolean(activa);
    const updated = await rules.findOneAndUpdate(
      { id: regla.id },
      { $set: cambios },
      { returnDocument: "after" },
    );

    await audit(request, { action: "regla.actualizada", entity: "category_rule", entityId: regla.id });
    return { regla: reglaPublica(updated) };
  });

  app.delete("/api/reglas/:id", { preHandler: requireRole("owner") }, async (request) => {
    const regla = await collection("category_rules").findOne({ id: request.params.id });
    if (!regla) throw notFound("Esa regla no existe.");

    await collection("category_rules").deleteOne({ id: regla.id });
    await audit(request, { action: "regla.borrada", entity: "category_rule", entityId: regla.id, meta: { patron: regla.pattern } });

    return { ok: true };
  });

  /**
   * Vuelve a clasificar movimientos con las reglas actuales.
   * Por defecto solo toca los que no tienen categoría, para no pisar las
   * correcciones hechas a mano; `incluirClasificados` fuerza el repaso completo.
   */
  app.post("/api/reglas/reclasificar", async (request) => {
    const { incluirClasificados = false, soloSimular = false } = request.body ?? {};

    const resultado = await transaction(async (client) => {
      const reglas = await cargarReglas(client);
      const movements = client.collection("movements");
      const rows = await movements.find(incluirClasificados ? {} : { category: null }).toArray();

      const cambios = [];
      for (const fila of rows) {
        const nueva = clasificar(fila.description, fila.direction, reglas);
        if (nueva && nueva !== fila.category) {
          cambios.push({ id: fila.id, descripcion: fila.description, antes: fila.category, despues: nueva });
          if (!soloSimular) {
            await movements.updateOne(
              { id: fila.id },
              { $set: { category: nueva, updated_at: new Date() } },
            );
          }
        }
      }

      return cambios;
    });

    if (!soloSimular) {
      await audit(request, {
        action: "movimientos.reclasificados",
        entity: "movement",
        meta: { cambios: resultado.length, incluirClasificados },
      });
    }

    return { cambios: resultado.length, detalle: resultado.slice(0, 100), simulado: Boolean(soloSimular) };
  });
}
