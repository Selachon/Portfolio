// Movimientos: consulta, alta manual, edición, borrado e importación pegada.

import { audit } from "../audit.js";
import { collection, transaction } from "../db/index.js";
import { badRequest, conflict, notFound } from "../http/errors.js";
import { requireRole } from "../auth/guard.js";
import { formatCents, parseAmountToCents } from "../domain/money.js";
import { normalizarPeriodo, parseSpanishDate } from "../domain/dates.js";
import { validarMovimiento } from "../domain/movements.js";
import { analizarLote, cargarReglas, insertarLote } from "../repos/movements.js";
import { parsearTablaPegada } from "../import/pastedTable.js";
import { asegurarRango, convertirCentavos, tasasDelRango } from "../services/tasas.js";

const LIMITE_MAXIMO = 500;

function movimientoPublico(fila) {
  return {
    id: fila.id,
    cuentaId: fila.account_id,
    cuenta: fila.cuenta,
    moneda: fila.currency,
    extractoId: fila.statement_id,
    fecha: typeof fila.occurred_on === "string" ? fila.occurred_on : fila.occurred_on.toISOString().slice(0, 10),
    descripcion: fila.description,
    centavos: Number(fila.amount_cents),
    sentido: fila.direction,
    categoria: fila.category,
    notas: fila.notes,
    origen: fila.source,
    // Solo presentes cuando se pidió ver la lista en otra moneda.
    centavosConvertidos: fila.convertido ?? undefined,
    tasaUsada: fila.tasa_usada ? fila.tasa_usada / 1_000_000 : undefined,
  };
}

function escaparRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Traduce los filtros públicos a un filtro MongoDB. */
function construirFiltros(consulta) {
  const filtro = {};
  if (consulta.cuenta) filtro.account_id = consulta.cuenta;
  if (consulta.moneda) filtro.currency = consulta.moneda;
  if (consulta.sentido) filtro.direction = consulta.sentido;
  if (consulta.categoria) filtro.category = consulta.categoria;
  if (consulta.extracto) filtro.statement_id = consulta.extracto;
  if (consulta.desde || consulta.hasta) {
    filtro.occurred_on = {};
    if (consulta.desde) filtro.occurred_on.$gte = consulta.desde;
    if (consulta.hasta) filtro.occurred_on.$lte = consulta.hasta;
  }

  const periodo = normalizarPeriodo(consulta.anio, consulta.mes);
  if (periodo) {
    const siguiente = periodo.mes === 12
      ? `${periodo.anio + 1}-01-01`
      : `${periodo.anio}-${String(periodo.mes + 1).padStart(2, "0")}-01`;
    filtro.occurred_on = {
      $gte: `${periodo.anio}-${String(periodo.mes).padStart(2, "0")}-01`,
      $lt: siguiente,
    };
  }

  if (consulta.texto) {
    filtro.description = { $regex: escaparRegex(String(consulta.texto).trim()), $options: "i" };
  }
  return filtro;
}

export default async function movementRoutes(app) {
  app.get("/api/movimientos", async (request) => {
    const consulta = request.query ?? {};
    const filtro = construirFiltros(consulta);

    const limite = Math.min(Number.parseInt(consulta.limite ?? "100", 10) || 100, LIMITE_MAXIMO);
    const desplazamiento = Math.max(Number.parseInt(consulta.desde_fila ?? "0", 10) || 0, 0);

    const rows = await collection("movements").find(filtro)
      .sort({ occurred_on: -1, created_at: -1 })
      .skip(desplazamiento)
      .limit(limite)
      .toArray();
    const accountIds = [...new Set(rows.map((row) => row.account_id))];
    const accounts = accountIds.length
      ? await collection("accounts").find({ id: { $in: accountIds } }, { projection: { id: 1, name: 1 } }).toArray()
      : [];
    const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
    for (const row of rows) row.cuenta = accountNames.get(row.account_id) ?? null;

    // Conversión solo para mirar: los movimientos siguen guardados en su
    // moneda. Cada uno se convierte con la tasa de SU día, no con la de hoy.
    const convertirA = (consulta.convertirA ?? "").toUpperCase();
    let convertidos = rows;

    if (convertirA === "COP" || convertirA === "USD") {
      const fechas = rows.map((fila) =>
        typeof fila.occurred_on === "string"
          ? fila.occurred_on
          : fila.occurred_on.toISOString().slice(0, 10),
      );

      if (fechas.length > 0) {
        const desde = fechas.reduce((a, b) => (a < b ? a : b));
        const hasta = fechas.reduce((a, b) => (a > b ? a : b));
        await asegurarRango(desde, hasta, { log: request.log });

        // Se leen también las semanas anteriores: si un movimiento cae en
        // festivo, fin de semana o en una fecha futura, se necesita la última
        // tasa publicada antes de él.
        const margen = new Date(`${desde}T00:00:00Z`);
        margen.setUTCDate(margen.getUTCDate() - 21);
        const tasas = await tasasDelRango(margen.toISOString().slice(0, 10), hasta);
        const ordenadas = [...tasas.keys()].sort();

        // Si un día no tiene tasa (festivo o fin de semana) se usa la última
        // anterior, que es lo que hacen los bancos.
        const tasaDe = (fecha) => {
          if (tasas.has(fecha)) return tasas.get(fecha);
          let elegida = null;
          for (const dia of ordenadas) {
            if (dia <= fecha) elegida = tasas.get(dia);
            else break;
          }
          return elegida;
        };

        convertidos = rows.map((fila, indice) => {
          const tasaMicro = tasaDe(fechas[indice]);
          const centavos = Number(fila.amount_cents);

          return {
            ...fila,
            convertido:
              fila.currency === convertirA
                ? centavos
                : convertirCentavos(centavos, tasaMicro, { de: fila.currency, a: convertirA }),
            tasa_usada: fila.currency === convertirA ? null : tasaMicro,
          };
        });
      }
    }

    const resumen = (await collection("movements").aggregate([
      { $match: filtro },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          ingresos: { $sum: { $cond: [{ $eq: ["$direction", "ingreso"] }, "$amount_cents", 0] } },
          gastos: { $sum: { $cond: [{ $eq: ["$direction", "gasto"] }, "$amount_cents", 0] } },
        },
      },
    ]).toArray())[0] ?? { total: 0, ingresos: 0, gastos: 0 };

    return {
      movimientos: convertidos.map(movimientoPublico),
      total: resumen.total,
      convertidoA: convertirA === "COP" || convertirA === "USD" ? convertirA : null,
      // Los totales solo tienen sentido si se filtró por una única moneda.
      totales: {
        ingresos: Number(resumen.ingresos),
        gastos: Number(resumen.gastos),
        neto: Number(resumen.ingresos) + Number(resumen.gastos),
      },
    };
  });

  app.get("/api/movimientos/categorias", async () => {
    const rows = await collection("movements").aggregate([
      { $match: { category: { $ne: null } } },
      { $group: { _id: "$category", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $project: { _id: 0, categoria: "$_id", total: 1 } },
    ]).toArray();
    return { categorias: rows };
  });

  app.post("/api/movimientos", async (request) => {
    const { cuentaId, fecha, descripcion, importe, categoria, notas } = request.body ?? {};

    const cuenta = await collection("accounts").findOne({ id: cuentaId });
    if (!cuenta) throw badRequest("Elige una cuenta válida.");

    const occurredOn = parseSpanishDate(fecha);
    const amountCents = parseAmountToCents(importe);

    const candidato = { occurredOn, description: descripcion, amountCents, category: categoria, notes: notas };
    const problemas = validarMovimiento(candidato);
    if (problemas.length > 0) throw badRequest(problemas.join(" "));

    const resultado = await transaction(async (client) => {
      const reglas = await cargarReglas(client);
      return insertarLote(client, {
        accountId: cuenta.id,
        currency: cuenta.currency,
        candidatos: [candidato],
        source: "manual",
        userId: request.user.id,
        reglas,
        // El alta manual es deliberada: si repite una fila existente, se acepta.
        duplicados: "insertar",
      });
    });

    const creado = resultado.insertados[0];
    if (!creado) throw conflict("No se pudo registrar el movimiento.");

    await audit(request, {
      action: "movimiento.creado",
      entity: "movement",
      entityId: creado.id,
      meta: { cuenta: cuenta.name, importe: formatCents(amountCents), fecha: occurredOn },
    });

    const fila = await collection("movements").findOne({ id: creado.id });
    fila.cuenta = cuenta.name;
    return { movimiento: movimientoPublico(fila) };
  });

  app.patch("/api/movimientos/:id", async (request) => {
    const { fecha, descripcion, importe, categoria, notas } = request.body ?? {};

    const movements = collection("movements");
    const actual = await movements.findOne({ id: request.params.id });
    if (!actual) throw notFound("Ese movimiento no existe.");

    const occurredOn = fecha === undefined ? null : parseSpanishDate(fecha);
    if (fecha !== undefined && !occurredOn) throw badRequest("La fecha no es válida.");

    const amountCents = importe === undefined ? null : parseAmountToCents(importe);
    if (importe !== undefined && (amountCents === null || amountCents === 0)) {
      throw badRequest("El importe no es válido.");
    }

    const cambios = { updated_at: new Date() };
    if (occurredOn) cambios.occurred_on = occurredOn;
    if (typeof descripcion === "string" && descripcion.trim()) cambios.description = descripcion.trim();
    if (amountCents !== null) {
      cambios.amount_cents = amountCents;
      cambios.direction = amountCents < 0 ? "gasto" : "ingreso";
    }
    if (categoria !== undefined) cambios.category = String(categoria) || null;
    if (notas !== undefined) cambios.notes = String(notas) || null;
    const updated = await movements.findOneAndUpdate(
      { id: actual.id },
      { $set: cambios },
      { returnDocument: "after" },
    );

    await audit(request, {
      action: "movimiento.editado",
      entity: "movement",
      entityId: actual.id,
      meta: {
        antes: { fecha: actual.occurred_on, importe: formatCents(Number(actual.amount_cents)), descripcion: actual.description },
        despues: { fecha: updated.occurred_on, importe: formatCents(Number(updated.amount_cents)), descripcion: updated.description },
      },
    });

    const fila = updated;
    fila.cuenta = (await collection("accounts").findOne({ id: fila.account_id }))?.name ?? null;
    return { movimiento: movimientoPublico(fila) };
  });

  // Borrar es cosa del propietario: el asesor corrige, no elimina.
  app.delete("/api/movimientos/:id", { preHandler: requireRole("owner") }, async (request) => {
    const movimiento = await collection("movements").findOne({ id: request.params.id });
    if (!movimiento) throw notFound("Ese movimiento no existe.");

    await collection("movements").deleteOne({ id: movimiento.id });
    await audit(request, {
      action: "movimiento.borrado",
      entity: "movement",
      entityId: movimiento.id,
      meta: {
        fecha: movimiento.occurred_on,
        descripcion: movimiento.description,
        importe: formatCents(Number(movimiento.amount_cents)),
      },
    });

    return { ok: true };
  });

  // ── Importación pegando una tabla ────────────────────────────────────────
  //
  // Dos pasos a propósito: primero se revisa lo que entraría, y solo después se
  // confirma. Nada entra a la contabilidad sin que alguien lo haya mirado.

  app.post("/api/movimientos/importar/revisar", async (request) => {
    const { cuentaId, contenido, anioPorDefecto } = request.body ?? {};

    const cuenta = await collection("accounts").findOne({ id: cuentaId });
    if (!cuenta) throw badRequest("Elige una cuenta válida.");

    const { filas, avisos } = parsearTablaPegada(contenido, { anioPorDefecto });
    if (filas.length === 0) {
      throw badRequest(
        "No se reconoció ninguna fila. Revisa que haya una columna de fecha, una de descripción y una de importe.",
        avisos,
      );
    }

    const analisis = await transaction(async (client) => {
      const reglas = await cargarReglas(client);
      return analizarLote(client, { accountId: cuenta.id, candidatos: filas, reglas });
    });

    return {
      cuenta: { id: cuenta.id, nombre: cuenta.name, moneda: cuenta.currency },
      avisos,
      resumen: {
        nuevos: analisis.filter((f) => f.estado === "nuevo").length,
        duplicados: analisis.filter((f) => f.estado === "duplicado").length,
        invalidos: analisis.filter((f) => f.estado === "invalido").length,
        sumaCentavos: analisis
          .filter((f) => f.estado !== "invalido")
          .reduce((total, f) => total + f.candidato.amountCents, 0),
      },
      filas: analisis,
    };
  });

  app.post("/api/movimientos/importar/confirmar", async (request) => {
    const { cuentaId, movimientos, duplicados = "omitir" } = request.body ?? {};

    const cuenta = await collection("accounts").findOne({ id: cuentaId });
    if (!cuenta) throw badRequest("Elige una cuenta válida.");
    if (!Array.isArray(movimientos) || movimientos.length === 0) {
      throw badRequest("No hay movimientos que confirmar.");
    }
    if (movimientos.length > 2000) {
      throw badRequest("Demasiadas filas de una vez. Divide la importación en varios bloques.");
    }

    const candidatos = movimientos.map((fila) => ({
      occurredOn: parseSpanishDate(fila.fecha),
      description: fila.descripcion,
      amountCents:
        typeof fila.centavos === "number" ? fila.centavos : parseAmountToCents(fila.importe),
      category: fila.categoria ?? null,
      notes: fila.notas ?? null,
    }));

    const resultado = await transaction(async (client) => {
      const reglas = await cargarReglas(client);
      return insertarLote(client, {
        accountId: cuenta.id,
        currency: cuenta.currency,
        candidatos,
        source: "csv",
        userId: request.user.id,
        reglas,
        duplicados: duplicados === "insertar" ? "insertar" : "omitir",
      });
    });

    await audit(request, {
      action: "movimientos.importados",
      entity: "account",
      entityId: cuenta.id,
      meta: {
        insertados: resultado.insertados.length,
        omitidos: resultado.omitidos.length,
        invalidos: resultado.invalidos.length,
      },
    });

    return {
      insertados: resultado.insertados.length,
      omitidos: resultado.omitidos.length,
      invalidos: resultado.invalidos,
    };
  });

  // ── Exportación ──────────────────────────────────────────────────────────

  app.get("/api/movimientos/export.csv", async (request, reply) => {
    const filtro = construirFiltros(request.query ?? {});
    const rows = await collection("movements").find(filtro).sort({ occurred_on: 1, created_at: 1 }).toArray();
    const accountIds = [...new Set(rows.map((row) => row.account_id))];
    const accounts = accountIds.length
      ? await collection("accounts").find({ id: { $in: accountIds } }, { projection: { id: 1, name: 1 } }).toArray()
      : [];
    const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
    for (const row of rows) row.cuenta = accountNames.get(row.account_id) ?? null;

    const escapar = (valor) => `"${String(valor ?? "").replace(/"/g, '""')}"`;
    const lineas = [
      ["Fecha", "Cuenta", "Descripcion", "Valor", "Moneda", "Sentido", "Categoria", "Notas"].join(","),
      ...rows.map((fila) =>
        [
          typeof fila.occurred_on === "string" ? fila.occurred_on : fila.occurred_on.toISOString().slice(0, 10),
          escapar(fila.cuenta),
          escapar(fila.description),
          formatCents(Number(fila.amount_cents)),
          fila.currency,
          fila.direction,
          escapar(fila.category),
          escapar(fila.notes),
        ].join(","),
      ),
    ];

    reply
      .header("Content-Type", "text/csv; charset=utf-8")
      .header("Content-Disposition", 'attachment; filename="movimientos-kora.csv"');

    // BOM para que Excel abra bien los acentos.
    return `\uFEFF${lineas.join("\n")}\n`;
  });
}
