// Extracción de texto de un PDF, conservando la posición de cada trozo.
//
// Un extracto bancario es una tabla, y `pdf.js` no devuelve tablas: devuelve
// fragmentos sueltos con sus coordenadas. Aquí se reconstruyen las filas
// agrupando por altura y se ordenan las celdas de izquierda a derecha, que es
// lo que permite luego leer columnas sin depender de espacios en blanco.

import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

// pdf.js necesita saber dónde están las métricas de las fuentes estándar para
// resolver bien los acentos; sin esto avisa en cada lectura.
// .../pdfjs-dist/legacy/build/pdf.mjs → .../pdfjs-dist
const RAIZ_PDFJS = dirname(dirname(dirname(require.resolve("pdfjs-dist/legacy/build/pdf.mjs"))));
const FUENTES_ESTANDAR = `${join(RAIZ_PDFJS, "standard_fonts")}/`;

// Tolerancia vertical: dos fragmentos a menos de esta distancia están en la
// misma fila. Los extractos usan cuerpos de 8-10 pt, así que 3 pt separa filas
// distintas sin partir una fila con superíndices.
const TOLERANCIA_FILA = 3;

async function cargarPdfjs() {
  // La build "legacy" es la que funciona en Node sin DOM ni workers.
  const pdfjs = require("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjs;
}

/**
 * Se lanza cuando el PDF viene cifrado. Los bancos colombianos suelen proteger
 * el extracto con la cédula del titular, así que hay que poder pedirla en vez
 * de fallar con un error genérico.
 */
export class ErrorContrasenaPdf extends Error {
  constructor(incorrecta) {
    super(
      incorrecta
        ? "La contraseña del PDF no es correcta."
        : "Este extracto está protegido con contraseña.",
    );
    this.name = "ErrorContrasenaPdf";
    this.incorrecta = incorrecta;
  }
}

/**
 * Devuelve las páginas del PDF como filas de celdas con coordenadas:
 * [{ pagina, filas: [{ y, celdas: [{ texto, x, ancho }] }] }]
 */
export async function extraerFilas(buffer, { contrasena = null } = {}) {
  const pdfjs = await cargarPdfjs();

  let documento;
  try {
    documento = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      password: contrasena ?? undefined,
      standardFontDataUrl: FUENTES_ESTANDAR,
      // Un extracto no debería traer fuentes ni scripts que ejecutar.
      isEvalSupported: false,
      useSystemFonts: false,
      disableFontFace: true,
    }).promise;
  } catch (error) {
    if (error?.name === "PasswordException") {
      // code 2 = la contraseña dada no sirve; 1 = no se dio ninguna.
      throw new ErrorContrasenaPdf(error.code === 2 || Boolean(contrasena));
    }
    throw error;
  }

  const paginas = [];

  for (let numero = 1; numero <= documento.numPages; numero += 1) {
    const pagina = await documento.getPage(numero);
    const contenido = await pagina.getTextContent();

    const fragmentos = contenido.items
      .filter((item) => typeof item.str === "string" && item.str.trim() !== "")
      .map((item) => ({
        texto: item.str,
        // transform = [a, b, c, d, e, f]: e y f son la posición.
        x: item.transform[4],
        y: item.transform[5],
        ancho: item.width ?? 0,
      }));

    paginas.push({ pagina: numero, filas: agruparEnFilas(fragmentos) });
  }

  await documento.destroy();
  return paginas;
}

/** Agrupa fragmentos por altura y los ordena de izquierda a derecha. */
function agruparEnFilas(fragmentos) {
  const filas = [];

  for (const fragmento of [...fragmentos].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const fila = filas.find((candidata) => Math.abs(candidata.y - fragmento.y) <= TOLERANCIA_FILA);

    if (fila) {
      fila.celdas.push(fragmento);
    } else {
      filas.push({ y: fragmento.y, celdas: [fragmento] });
    }
  }

  for (const fila of filas) {
    fila.celdas.sort((a, b) => a.x - b.x);
    fila.texto = fila.celdas.map((celda) => celda.texto.trim()).join(" ").replace(/\s+/g, " ").trim();
  }

  return filas;
}

/** Todo el texto del PDF, para archivar y poder reprocesar más adelante. */
export function textoPlano(paginas) {
  return paginas
    .map((pagina) => pagina.filas.map((fila) => fila.texto).join("\n"))
    .join("\n\n");
}
