// Tipo de cambio: consulta y refresco.

import { collection } from "../db/index.js";
import { badRequest } from "../http/errors.js";
import { asegurarRango, tasaParaFecha } from "../services/tasas.js";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export default async function rateRoutes(app) {
  /** Tasa vigente hoy (o en la fecha que se pida). */
  app.get("/api/tasa", async (request) => {
    const fecha = request.query?.fecha ?? new Date().toISOString().slice(0, 10);
    if (!FECHA.test(fecha)) throw badRequest("La fecha debe ser AAAA-MM-DD.");

    await asegurarRango(fecha, fecha, { log: request.log });
    const tasa = await tasaParaFecha(fecha);

    if (!tasa) {
      return {
        tasa: null,
        aviso:
          "Todavía no hay ninguna tasa guardada y no se pudo consultar la TRM. " +
          "Vuelve a intentarlo cuando haya conexión.",
      };
    }

    return {
      tasa: {
        fecha: tasa.fecha,
        pesosPorDolar: tasa.tasaMicro / 1_000_000,
        fuente: tasa.fuente,
        exacta: tasa.exacta,
      },
    };
  });

  /** Historial guardado, para ver de dónde salió cada conversión. */
  app.get("/api/tasa/historial", async (request) => {
    const limite = Math.min(Number.parseInt(request.query?.limite ?? "60", 10) || 60, 400);

    const rows = await collection("fx_rates").find(
      { base: "USD", cotizada: "COP" },
      { projection: { fecha: 1, tasa_micro: 1, fuente: 1, obtenida: 1 } },
    ).sort({ fecha: -1 }).limit(limite).toArray();

    return {
      tasas: rows.map((fila) => ({
        fecha: (typeof fila.fecha === "string" ? fila.fecha : fila.fecha.toISOString()).slice(0, 10),
        pesosPorDolar: Number(fila.tasa_micro) / 1_000_000,
        fuente: fila.fuente,
        obtenida: fila.obtenida,
      })),
    };
  });
}
