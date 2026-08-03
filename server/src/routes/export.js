// Exportación completa y portable de la base documental.

import { audit } from "../audit.js";
import { collection } from "../db/index.js";
import { requireRole } from "../auth/guard.js";

function sinIdInterno(row) {
  const { _id, ...publicRow } = row;
  return publicRow;
}

async function documents(name, { sort = {}, projection } = {}) {
  const rows = await collection(name).find({}, projection ? { projection } : {}).sort(sort).toArray();
  return rows.map(sinIdInterno);
}

export default async function exportRoutes(app) {
  app.get("/api/export/todo", { preHandler: requireRole("owner") }, async (request, reply) => {
    const incluirPdfs = request.query?.pdfs !== "no";
    const [cuentas, movimientos, presupuesto, estadosPresupuesto, deudas, deudores, reportes, reglas, statementRows] =
      await Promise.all([
        documents("accounts", { sort: { name: 1 } }),
        documents("movements", { sort: { occurred_on: 1, created_at: 1 } }),
        documents("budget_items", { sort: { concept: 1 } }),
        documents("budget_periods"),
        documents("debts", { sort: { concept: 1 } }),
        documents("receivables", { sort: { debtor: 1 } }),
        documents("reports", { sort: { period_year: 1, period_month: 1 } }),
        documents("category_rules", { sort: { priority: 1 } }),
        documents("statements", {
          projection: incluirPdfs
            ? { extracted_text: 0 }
            : { content: 0, extracted_text: 0, parse_warnings: 0 },
        }),
      ]);

    const extractos = statementRows.map((row) => {
      if (!incluirPdfs) return row;
      const { content, ...rest } = row;
      return { ...rest, contenido_base64: content ? Buffer.from(content).toString("base64") : null };
    });

    const usuarios = await documents("users", {
      sort: { created_at: 1 },
      projection: { password_hash: 0, totp_secret: 0, updated_at: 0 },
    });

    await audit(request, {
      action: "export.completo",
      entity: "sistema",
      meta: { movimientos: movimientos.length, extractos: extractos.length, incluirPdfs },
    });

    const marca = new Date().toISOString().slice(0, 10);
    reply
      .header("Content-Type", "application/json; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="kora-respaldo-${marca}.json"`);

    return {
      generadoEn: new Date().toISOString(),
      aviso:
        "Respaldo completo del portal. Contiene información financiera: guárdalo cifrado. " +
        "No incluye contraseñas ni sesiones.",
      usuarios,
      cuentas,
      movimientos,
      presupuesto,
      estadosPresupuesto,
      deudas,
      deudores,
      reportes,
      reglas,
      extractos,
    };
  });
}
