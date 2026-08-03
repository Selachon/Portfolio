// Lectura de una tabla pegada.
//
// Es el camino que sustituye al copiar-y-pegar en la hoja: tu hermano pega lo
// que tenga (CSV, columnas separadas por tabulaciones, o una tabla en Markdown
// como la que suelta una IA) y aquí se convierte en filas comprobables.
//
// Deliberadamente tolerante con el formato, pero nunca adivina un importe: si
// una fila no se entiende, se marca y se muestra en la revisión en vez de
// colarse con un valor inventado.

import { parseSpanishDate } from "../domain/dates.js";
import { parseAmountToCents } from "../domain/money.js";

const CABECERAS_FECHA = ["fecha", "fecha operacion", "fecha operación", "dia", "día", "date"];
const CABECERAS_DESCRIPCION = ["descripcion", "descripción", "concepto", "detalle", "tipo", "description"];
const CABECERAS_IMPORTE = ["valor", "importe", "monto", "monto usd", "amount", "valor usd"];
const CABECERAS_SENTIDO = ["a", "sentido", "tipo movimiento", "ingreso/gasto", "direccion", "dirección"];
const CABECERAS_CATEGORIA = ["categoria", "categoría", "category"];
const CABECERAS_NOTAS = ["notas", "nota", "observaciones", "notes"];

function sinAcentos(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/** Parte una línea en celdas, aceptando tabulación, punto y coma, coma o pipe. */
function partirLinea(linea, separador) {
  if (separador === "|") {
    return linea
      .replace(/^\s*\|/, "")
      .replace(/\|\s*$/, "")
      .split("|")
      .map((celda) => celda.trim());
  }

  if (separador !== ",") {
    return linea.split(separador).map((celda) => celda.trim());
  }

  // Con comas hay que respetar las comillas: los importes traen comas de miles.
  const celdas = [];
  let actual = "";
  let entreComillas = false;

  for (let i = 0; i < linea.length; i += 1) {
    const caracter = linea[i];

    if (caracter === '"') {
      if (entreComillas && linea[i + 1] === '"') {
        actual += '"';
        i += 1;
      } else {
        entreComillas = !entreComillas;
      }
    } else if (caracter === "," && !entreComillas) {
      celdas.push(actual.trim());
      actual = "";
    } else {
      actual += caracter;
    }
  }

  celdas.push(actual.trim());
  return celdas;
}

/** Elige el separador más probable mirando la consistencia entre líneas. */
function detectarSeparador(lineas) {
  const candidatos = ["\t", "|", ";", ","];
  let mejor = { separador: "\t", puntaje: -1 };

  for (const separador of candidatos) {
    const conteos = lineas
      .slice(0, 20)
      .map((linea) => partirLinea(linea, separador).length)
      .filter((n) => n > 1);

    if (conteos.length === 0) continue;

    // Un buen separador produce el mismo número de columnas en casi todas las
    // líneas; uno malo produce números erráticos.
    const moda = conteos.sort(
      (a, b) => conteos.filter((n) => n === b).length - conteos.filter((n) => n === a).length,
    )[0];
    const consistentes = conteos.filter((n) => n === moda).length;
    const puntaje = consistentes * moda;

    if (puntaje > mejor.puntaje) mejor = { separador, puntaje };
  }

  return mejor.separador;
}

function indiceDe(cabeceras, nombres) {
  return cabeceras.findIndex((cabecera) => nombres.includes(cabecera));
}

/** Localiza las columnas por su nombre, o las adivina por su contenido. */
function mapearColumnas(cabeceras, primeraFilaDeDatos) {
  const mapa = {
    fecha: indiceDe(cabeceras, CABECERAS_FECHA),
    descripcion: indiceDe(cabeceras, CABECERAS_DESCRIPCION),
    importe: indiceDe(cabeceras, CABECERAS_IMPORTE),
    sentido: indiceDe(cabeceras, CABECERAS_SENTIDO),
    categoria: indiceDe(cabeceras, CABECERAS_CATEGORIA),
    notas: indiceDe(cabeceras, CABECERAS_NOTAS),
  };

  // Sin cabeceras reconocibles, se deducen por lo que contiene la primera fila.
  if (mapa.fecha === -1 && primeraFilaDeDatos) {
    mapa.fecha = primeraFilaDeDatos.findIndex((celda) => parseSpanishDate(celda) !== null);
  }
  if (mapa.importe === -1 && primeraFilaDeDatos) {
    mapa.importe = primeraFilaDeDatos.findIndex(
      (celda, indice) => indice !== mapa.fecha && parseAmountToCents(celda) !== null,
    );
  }
  if (mapa.descripcion === -1 && primeraFilaDeDatos) {
    mapa.descripcion = primeraFilaDeDatos.findIndex(
      (celda, indice) =>
        indice !== mapa.fecha && indice !== mapa.importe && String(celda ?? "").trim().length > 2,
    );
  }

  return mapa;
}

/** Una fila de separadores de tabla Markdown (|:-:|:-:|) no es un dato. */
function esSeparadorMarkdown(linea) {
  return /^[\s|:-]+$/.test(linea) && linea.includes("-");
}

/**
 * Convierte texto pegado en filas listas para revisar.
 * Devuelve { filas, avisos }.
 */
export function parsearTablaPegada(contenido, { anioPorDefecto = null } = {}) {
  const avisos = [];

  if (typeof contenido !== "string" || !contenido.trim()) {
    return { filas: [], avisos: ["No llegó ningún contenido."] };
  }

  const lineas = contenido
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0 && !esSeparadorMarkdown(linea));

  if (lineas.length === 0) return { filas: [], avisos: ["El contenido está vacío."] };

  const separador = detectarSeparador(lineas);
  const celdasPorLinea = lineas.map((linea) => partirLinea(linea, separador));

  // ¿La primera línea es cabecera? Lo es si no contiene una fecha reconocible.
  const primera = celdasPorLinea[0];
  const primeraEsCabecera = !primera.some((celda) => parseSpanishDate(celda, { anioPorDefecto }));

  const cabeceras = primeraEsCabecera ? primera.map(sinAcentos) : [];
  const filasDeDatos = primeraEsCabecera ? celdasPorLinea.slice(1) : celdasPorLinea;

  const columnas = mapearColumnas(cabeceras, filasDeDatos[0]);

  if (columnas.fecha === -1) avisos.push("No se encontró la columna de fecha.");
  if (columnas.importe === -1) avisos.push("No se encontró la columna de importe.");
  if (columnas.descripcion === -1) avisos.push("No se encontró la columna de descripción.");

  if (columnas.fecha === -1 || columnas.importe === -1) return { filas: [], avisos };

  const filas = [];
  let sinReconocer = 0;

  for (const [numero, celdas] of filasDeDatos.entries()) {
    const textoFecha = celdas[columnas.fecha];
    const textoImporte = celdas[columnas.importe];

    const occurredOn = parseSpanishDate(textoFecha, { anioPorDefecto });
    let amountCents = parseAmountToCents(textoImporte);

    if (!occurredOn || amountCents === null || amountCents === 0) {
      // Las filas de totales ("Suma total", "SUMA") caen aquí y se ignoran, que
      // es lo correcto: son un cálculo, no un movimiento.
      sinReconocer += 1;
      continue;
    }

    // Si hay columna de sentido, manda ella: en tu hoja los gastos vienen en
    // negativo, pero algunos extractos los listan en positivo con la palabra
    // "Gasto" al lado.
    const sentido = columnas.sentido !== -1 ? sinAcentos(celdas[columnas.sentido]) : null;
    if (sentido === "gasto" && amountCents > 0) amountCents = -amountCents;
    if (sentido === "ingreso" && amountCents < 0) amountCents = -amountCents;

    const descripcion =
      columnas.descripcion !== -1 ? String(celdas[columnas.descripcion] ?? "").trim() : "";

    filas.push({
      lineaOriginal: numero + (primeraEsCabecera ? 2 : 1),
      occurredOn,
      description: descripcion || "(sin descripción)",
      amountCents,
      category: columnas.categoria !== -1 ? celdas[columnas.categoria] || null : null,
      notes: columnas.notas !== -1 ? celdas[columnas.notas] || null : null,
    });
  }

  if (sinReconocer > 0) {
    avisos.push(
      `Se ignoraron ${sinReconocer} línea(s) sin fecha o sin importe válidos ` +
        "(suelen ser cabeceras repetidas o filas de totales).",
    );
  }

  return { filas, avisos };
}
