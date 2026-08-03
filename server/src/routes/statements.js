// Extractos en PDF.
//
// El PDF original se guarda tal cual, junto con el texto que se le extrajo. Eso
// permite dos cosas: adjuntarlo al reporte del mes como respaldo, y reprocesar
// un mes cuando el perfil del banco mejore, sin tener que volver a pedirlo.

import { createHash } from "node:crypto";
import { audit } from "../audit.js";
import { config } from "../config.js";
import { collection, createDocument, transaction } from "../db/index.js";
import { badRequest, conflict, notFound } from "../http/errors.js";
import { requireRole } from "../auth/guard.js";
import { normalizarPeriodo } from "../domain/dates.js";
import { leerExtracto } from "../parsers/index.js";
import { ErrorContrasenaPdf } from "../parsers/pdfText.js";
import { PERFILES } from "../parsers/profiles.js";
import { analizarLote, cargarReglas, insertarLote } from "../repos/movements.js";

const PDF_MAGIC = Buffer.from("%PDF-");

function extractoPublico(fila) {
  return {
    id: fila.id,
    cuentaId: fila.account_id,
    cuenta: fila.cuenta,
    anio: fila.period_year,
    mes: fila.period_month,
    archivo: fila.file_name,
    bytes: fila.byte_size,
    sha256: fila.sha256,
    estado: fila.parse_status,
    perfil: fila.parse_profile,
    avisos: fila.parse_warnings,
    subidoEn: fila.uploaded_at,
    movimientos: fila.movimientos === undefined ? undefined : Number(fila.movimientos),
  };
}

export default async function statementRoutes(app) {
  app.get("/api/extractos/perfiles", async () => ({
    perfiles: PERFILES.map((perfil) => ({
      id: perfil.id,
      nombre: perfil.nombre,
      moneda: perfil.moneda,
    })),
  }));

  app.get("/api/extractos", async (request) => {
    const periodo = normalizarPeriodo(request.query?.anio, request.query?.mes);
    const filter = periodo ? { period_year: periodo.anio, period_month: periodo.mes } : {};
    const rows = await collection("statements").find(filter)
      .sort({ period_year: -1, period_month: -1, uploaded_at: -1 })
      .toArray();
    const accountIds = [...new Set(rows.map((row) => row.account_id))];
    const accounts = accountIds.length
      ? await collection("accounts").find({ id: { $in: accountIds } }, { projection: { id: 1, name: 1 } }).toArray()
      : [];
    const names = new Map(accounts.map((account) => [account.id, account.name]));
    const counts = rows.length
      ? await collection("movements").aggregate([
          { $match: { statement_id: { $in: rows.map((row) => row.id) } } },
          { $group: { _id: "$statement_id", total: { $sum: 1 } } },
        ]).toArray()
      : [];
    const movementCounts = new Map(counts.map((row) => [row._id, row.total]));
    for (const row of rows) {
      row.cuenta = names.get(row.account_id) ?? null;
      row.movimientos = movementCounts.get(row.id) ?? 0;
    }

    return { extractos: rows.map(extractoPublico) };
  });

  /**
   * Sube un PDF y lo lee, pero NO registra ningún movimiento: devuelve los
   * candidatos ya cotejados contra lo que hay para que alguien los revise.
   */
  app.post("/api/extractos", async (request) => {
    const archivo = await request.file({ limits: { fileSize: config.maxUploadBytes } });
    if (!archivo) throw badRequest("No llegó ningún archivo.");

    const campos = archivo.fields ?? {};
    const valor = (nombre) => campos[nombre]?.value;

    const periodo = normalizarPeriodo(valor("anio"), valor("mes"));
    if (!periodo) throw badRequest("Indica el año y el mes del extracto.");

    const cuenta = await collection("accounts").findOne({ id: valor("cuentaId") });
    if (!cuenta) throw badRequest("Elige una cuenta válida.");

    const contenido = await archivo.toBuffer();

    // Que la extensión diga .pdf no basta: se comprueba la firma del archivo.
    if (!contenido.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
      throw badRequest("El archivo no es un PDF.");
    }

    const sha256 = createHash("sha256").update(contenido).digest("hex");
    const statements = collection("statements");
    const yaEstaba = await statements.findOne({ account_id: cuenta.id, sha256 });
    if (yaEstaba) {
      throw conflict(
        `Ese mismo PDF ya se subió a esta cuenta (${yaEstaba.file_name}). ` +
          "Ábrelo desde la lista de extractos en vez de volver a cargarlo.",
        { extractoId: yaEstaba.id },
      );
    }

    let lectura;
    try {
      lectura = await leerExtracto(contenido, {
        anio: periodo.anio,
        mes: periodo.mes,
        moneda: cuenta.currency,
        perfilForzado: valor("perfil") || null,
        contrasena: valor("contrasena") || null,
      });
    } catch (error) {
      // El PDF cifrado no es un fallo: hay que poder pedir la contraseña y
      // reintentar, así que se responde con un código que la UI reconoce.
      if (error instanceof ErrorContrasenaPdf) {
        throw badRequest(error.message, { necesitaContrasena: true, incorrecta: error.incorrecta });
      }

      request.log.error({ err: error }, "no se pudo leer el PDF");
      throw badRequest(
        "No se pudo leer el PDF. Si es un escaneo (una imagen sin texto), pega la " +
          "tabla a mano desde el importador.",
      );
    }

    const statement = createDocument({
      account_id: cuenta.id,
      period_year: periodo.anio,
      period_month: periodo.mes,
      file_name: archivo.filename ?? "extracto.pdf",
      mime_type: archivo.mimetype ?? "application/pdf",
      byte_size: contenido.length,
      sha256,
      content: contenido,
      extracted_text: lectura.textoExtraido,
      parse_profile: lectura.perfil?.id ?? null,
      parse_status: lectura.filas.length > 0 ? "procesado" : "error",
      parse_warnings: lectura.avisos,
      uploaded_by: request.user.id,
      uploaded_at: new Date(),
    });
    await statements.insertOne(statement);
    const extractoId = statement.id;

    // Se cotejan los candidatos contra lo ya registrado para marcar repetidos.
    const analisis = await transaction(async (client) => {
      const reglas = await cargarReglas(client);
      return analizarLote(client, {
        accountId: cuenta.id,
        candidatos: lectura.filas.map((fila) => ({
          occurredOn: fila.occurredOn,
          description: fila.description,
          amountCents: fila.amountCents,
        })),
        reglas,
      });
    });

    await audit(request, {
      action: "extracto.subido",
      entity: "statement",
      entityId: extractoId,
      meta: { cuenta: cuenta.name, ...periodo, filas: lectura.filas.length, perfil: lectura.perfil?.id },
    });

    return {
      extractoId,
      cuenta: { id: cuenta.id, nombre: cuenta.name, moneda: cuenta.currency },
      periodo,
      perfil: lectura.perfil,
      avisos: lectura.avisos,
      sinReconocer: lectura.sinReconocer,
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

  /** Confirma los movimientos revisados de un extracto ya subido. */
  app.post("/api/extractos/:id/confirmar", async (request) => {
    const extracto = await collection("statements").findOne({ id: request.params.id });
    if (!extracto) throw notFound("Ese extracto no existe.");
    const cuenta = await collection("accounts").findOne({ id: extracto.account_id });
    if (!cuenta) throw notFound("La cuenta de ese extracto ya no existe.");
    extracto.currency = cuenta.currency;
    extracto.cuenta = cuenta.name;

    const { movimientos, duplicados = "omitir" } = request.body ?? {};
    if (!Array.isArray(movimientos) || movimientos.length === 0) {
      throw badRequest("No hay movimientos que confirmar.");
    }

    const resultado = await transaction(async (client) => {
      const reglas = await cargarReglas(client);
      return insertarLote(client, {
        accountId: extracto.account_id,
        currency: extracto.currency,
        candidatos: movimientos.map((fila) => ({
          occurredOn: fila.fecha,
          description: fila.descripcion,
          amountCents: fila.centavos,
          category: fila.categoria ?? null,
          notes: fila.notas ?? null,
        })),
        source: "pdf",
        statementId: extracto.id,
        userId: request.user.id,
        reglas,
        duplicados: duplicados === "insertar" ? "insertar" : "omitir",
      });
    });

    await audit(request, {
      action: "extracto.confirmado",
      entity: "statement",
      entityId: extracto.id,
      meta: {
        cuenta: extracto.cuenta,
        insertados: resultado.insertados.length,
        omitidos: resultado.omitidos.length,
      },
    });

    return {
      insertados: resultado.insertados.length,
      omitidos: resultado.omitidos.length,
      invalidos: resultado.invalidos,
    };
  });

  /** Vuelve a leer un extracto guardado, sin volver a subirlo. */
  app.post("/api/extractos/:id/reprocesar", async (request) => {
    const extracto = await collection("statements").findOne({ id: request.params.id });
    if (!extracto) throw notFound("Ese extracto no existe.");
    const cuenta = await collection("accounts").findOne({ id: extracto.account_id });
    if (!cuenta) throw notFound("La cuenta de ese extracto ya no existe.");
    extracto.currency = cuenta.currency;

    const lectura = await leerExtracto(extracto.content, {
      anio: extracto.period_year,
      mes: extracto.period_month,
      moneda: extracto.currency,
      perfilForzado: request.body?.perfil ?? null,
      contrasena: request.body?.contrasena ?? null,
    });

    const analisis = await transaction(async (client) => {
      const reglas = await cargarReglas(client);
      return analizarLote(client, {
        accountId: extracto.account_id,
        candidatos: lectura.filas.map((fila) => ({
          occurredOn: fila.occurredOn,
          description: fila.description,
          amountCents: fila.amountCents,
        })),
        reglas,
      });
    });

    await collection("statements").updateOne(
      { id: extracto.id },
      { $set: { parse_profile: lectura.perfil?.id ?? null, parse_warnings: lectura.avisos, updated_at: new Date() } },
    );

    return {
      extractoId: extracto.id,
      perfil: lectura.perfil,
      avisos: lectura.avisos,
      sinReconocer: lectura.sinReconocer,
      filas: analisis,
    };
  });

  /** Descarga del PDF original: el respaldo del mes. */
  app.get("/api/extractos/:id/archivo", async (request, reply) => {
    const extracto = await collection("statements").findOne(
      { id: request.params.id },
      { projection: { file_name: 1, mime_type: 1, content: 1 } },
    );
    if (!extracto) throw notFound("Ese extracto no existe.");

    // El nombre va entre comillas y sin saltos, para que no se pueda inyectar
    // nada en la cabecera.
    const nombre = String(extracto.file_name).replace(/["\r\n]/g, "").slice(0, 120);

    reply
      .header("Content-Type", extracto.mime_type || "application/pdf")
      .header("Content-Disposition", `inline; filename="${nombre}"`);

    return Buffer.from(extracto.content);
  });

  app.delete("/api/extractos/:id", { preHandler: requireRole("owner") }, async (request) => {
    const extracto = await collection("statements").findOne({ id: request.params.id });
    if (!extracto) throw notFound("Ese extracto no existe.");

    // Los movimientos sobreviven al extracto: se quedan sin adjunto, pero la
    // contabilidad no se toca. Borrar el PDF no puede borrar el mes.
    await transaction(async (db) => {
      await db.collection("movements").updateMany(
        { statement_id: extracto.id },
        { $set: { statement_id: null, updated_at: new Date() } },
      );
      await db.collection("statements").deleteOne({ id: extracto.id });
    });
    await audit(request, {
      action: "extracto.borrado",
      entity: "statement",
      entityId: extracto.id,
      meta: { archivo: extracto.file_name },
    });

    return { ok: true };
  });
}
