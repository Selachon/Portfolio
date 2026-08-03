// Migración desde la hoja de cálculo.
//
// Uso:
//   node scripts/importar-hoja.js movimientos "Cuenta principal" ruta.csv [--anio 2026]
//   node scripts/importar-hoja.js presupuesto  ruta.csv
//   node scripts/importar-hoja.js deudas       ruta.csv
//   node scripts/importar-hoja.js deudores     ruta.csv
//
// Exporta cada pestaña de la hoja como CSV (Archivo → Descargar → CSV) y pásala
// aquí. Es idempotente: correrlo dos veces no duplica movimientos, porque usa
// la misma huella que el importador del portal.
//
// Las columnas se reconocen por su nombre, con los mismos encabezados que ya
// tiene tu hoja ("Concepto", "Día", "Valor", "Frecuencia", "Tipo", "Pago"...).

import { readFile } from "node:fs/promises";
import { parseAmountToCents } from "../src/domain/money.js";
import { parsearTablaPegada } from "../src/import/pastedTable.js";
import { closeDb, collection, createDocument, initDb, transaction } from "../src/db/index.js";
import { runMigrations } from "../src/db/migrate.js";
import { cargarReglas, insertarLote } from "../src/repos/movements.js";

function argumento(nombre, porDefecto = null) {
  const indice = process.argv.indexOf(`--${nombre}`);
  return indice === -1 ? porDefecto : process.argv[indice + 1];
}

function celdas(linea) {
  const salida = [];
  let actual = "";
  let comillas = false;

  for (let i = 0; i < linea.length; i += 1) {
    const caracter = linea[i];
    if (caracter === '"') {
      if (comillas && linea[i + 1] === '"') {
        actual += '"';
        i += 1;
      } else {
        comillas = !comillas;
      }
    } else if (caracter === "," && !comillas) {
      salida.push(actual.trim());
      actual = "";
    } else {
      actual += caracter;
    }
  }

  salida.push(actual.trim());
  return salida;
}

function sinAcentos(texto) {
  return String(texto ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

/** Lee un CSV con encabezado y devuelve objetos con las claves normalizadas. */
async function leerCsv(ruta) {
  const lineas = (await readFile(ruta, "utf8"))
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean);

  if (lineas.length < 2) throw new Error(`${ruta} no tiene datos.`);

  const encabezados = celdas(lineas[0]).map(sinAcentos);

  return lineas.slice(1).map((linea) => {
    const valores = celdas(linea);
    return Object.fromEntries(encabezados.map((clave, indice) => [clave, valores[indice] ?? ""]));
  });
}

async function cuentaPorNombre(nombre) {
  const cuenta = await collection("accounts").findOne(
    { name: nombre },
    { collation: { locale: "es", strength: 2 } },
  );
  if (!cuenta) {
    const rows = await collection("accounts").find({}, { projection: { name: 1 } }).sort({ name: 1 }).toArray();
    throw new Error(
      `No existe la cuenta "${nombre}". Créala primero en el portal. ` +
        `Cuentas actuales: ${rows.map((f) => f.name).join(", ") || "(ninguna)"}`,
    );
  }
  return cuenta;
}

async function importarMovimientos() {
  const nombreCuenta = process.argv[3];
  const ruta = process.argv[4];
  const anio = Number(argumento("anio", new Date().getFullYear()));

  if (!nombreCuenta || !ruta) {
    throw new Error('Uso: importar-hoja.js movimientos "Nombre de la cuenta" ruta.csv [--anio 2026]');
  }

  const cuenta = await cuentaPorNombre(nombreCuenta);
  const contenido = await readFile(ruta, "utf8");
  const { filas, avisos } = parsearTablaPegada(contenido, { anioPorDefecto: anio });

  avisos.forEach((aviso) => console.log(`  · ${aviso}`));
  if (filas.length === 0) throw new Error("No se reconoció ninguna fila.");

  const suma = filas.reduce((total, fila) => total + fila.amountCents, 0);
  console.log(`  ${filas.length} filas leídas · suma ${(suma / 100).toFixed(2)}`);

  const resultado = await transaction(async (client) => {
    const reglas = await cargarReglas(client);
    return insertarLote(client, {
      accountId: cuenta.id,
      currency: cuenta.currency,
      candidatos: filas,
      source: "migracion",
      reglas,
      // Un extracto puede traer dos cobros idénticos el mismo día; la huella
      // con ordinal ya distingue lo repetido de lo legítimo.
      duplicados: "insertar",
    });
  });

  console.log(
    `✓ ${resultado.insertados.length} registrados · ${resultado.omitidos.length} ya estaban · ` +
      `${resultado.invalidos.length} descartados`,
  );
}

async function importarPresupuesto() {
  const ruta = process.argv[3];
  if (!ruta) throw new Error("Uso: importar-hoja.js presupuesto ruta.csv");

  const filas = await leerCsv(ruta);
  let creados = 0;

  for (const fila of filas) {
    const concepto = fila.concepto;
    const centavos = parseAmountToCents(fila.valor);
    if (!concepto || centavos === null || centavos <= 0) continue;

    const tipo = sinAcentos(fila.tipo) === "ingreso" ? "ingreso" : "gasto";
    const pago = sinAcentos(fila.pago).startsWith("auto") ? "automatico" : "manual";
    const frecuencia = { mensual: "mensual", bimestral: "bimestral", trimestral: "trimestral", semestral: "semestral", anual: "anual" }[
      sinAcentos(fila.frecuencia)
    ] ?? "mensual";

    const dia = Number.parseInt(fila["dia"] ?? fila["día"], 10);

    const items = collection("budget_items");
    const yaEstaba = await items.findOne(
      { concept: concepto },
      { collation: { locale: "es", strength: 2 }, projection: { id: 1 } },
    );
    if (yaEstaba) continue;

    await items.insertOne(createDocument({
      concept: concepto,
      day_of_month: Number.isInteger(dia) && dia >= 1 && dia <= 31 ? dia : null,
      amount_cents: centavos,
      currency: "COP",
      frequency: frecuencia,
      kind: tipo,
      payment_mode: pago,
      notes: fila.notas || null,
      active: true,
    }));
    creados += 1;
  }

  console.log(`✓ ${creados} concepto(s) de presupuesto creados (los repetidos se saltaron).`);
}

async function importarDeudas() {
  const ruta = process.argv[3];
  if (!ruta) throw new Error("Uso: importar-hoja.js deudas ruta.csv");

  const filas = await leerCsv(ruta);
  let creadas = 0;

  for (const fila of filas) {
    const concepto = fila.concepto;
    const centavos = parseAmountToCents(fila.valor);
    const cuotas = Number.parseInt(fila.cuotas, 10);
    const pagadas = Number.parseInt(fila.pagadas, 10) || 0;

    if (!concepto || centavos === null || centavos <= 0 || !Number.isInteger(cuotas) || cuotas < 1) continue;
    if (pagadas > cuotas) continue;

    const debts = collection("debts");
    const yaEstaba = await debts.findOne(
      { concept: concepto },
      { collation: { locale: "es", strength: 2 }, projection: { id: 1 } },
    );
    if (yaEstaba) continue;

    const dia = Number.parseInt(fila["dia"] ?? fila["día"], 10);
    await debts.insertOne(createDocument({
      concept: concepto,
      principal_cents: centavos,
      currency: "COP",
      day_of_month: Number.isInteger(dia) ? dia : null,
      installments_total: cuotas,
      installments_paid: pagadas,
      remaining_cents: Math.trunc((centavos * (cuotas - pagadas)) / cuotas),
      notes: fila.notas || null,
      active: true,
    }));
    creadas += 1;
  }

  console.log(`✓ ${creadas} deuda(s) creadas.`);
}

async function importarDeudores() {
  const ruta = process.argv[3];
  if (!ruta) throw new Error("Uso: importar-hoja.js deudores ruta.csv");

  const filas = await leerCsv(ruta);
  let creados = 0;

  for (const fila of filas) {
    const deudor = fila.deudor;
    const centavos = parseAmountToCents(fila.valor);
    if (!deudor || centavos === null || centavos <= 0) continue;

    const receivables = collection("receivables");
    const yaEstaba = await receivables.findOne(
      { debtor: deudor },
      { collation: { locale: "es", strength: 2 }, projection: { id: 1 } },
    );
    if (yaEstaba) continue;

    const dia = Number.parseInt(fila["dia"] ?? fila["día"], 10);
    const notas = fila.notas || null;

    await receivables.insertOne(createDocument({
      debtor: deudor,
      amount_cents: centavos,
      currency: "COP",
      day_of_month: Number.isInteger(dia) ? dia : null,
      notes: notas,
      status: sinAcentos(notas) === "cobrado" ? "cobrado" : "pendiente",
    }));
    creados += 1;
  }

  console.log(`✓ ${creados} deudor(es) creados.`);
}

const ACCIONES = {
  movimientos: importarMovimientos,
  presupuesto: importarPresupuesto,
  deudas: importarDeudas,
  deudores: importarDeudores,
};

const accion = ACCIONES[process.argv[2]];

if (!accion) {
  console.error(`Acciones disponibles: ${Object.keys(ACCIONES).join(", ")}`);
  process.exit(1);
}

try {
  await initDb();
  await runMigrations({ log: () => {} });
  await accion();
} catch (error) {
  console.error(`✗ ${error.message}`);
  process.exitCode = 1;
} finally {
  await closeDb();
}
