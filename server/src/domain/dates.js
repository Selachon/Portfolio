// Fechas.
//
// Los extractos y la hoja escriben las fechas de varias maneras según el banco
// y el mes: "01 feb. 2026", "jun 01", "01/02/2026", "2026-02-01". Todas se
// normalizan a un ISO simple (AAAA-MM-DD), sin objetos Date intermedios: crear
// un Date desde una cadena arrastra la zona horaria y puede correr el día.

const MESES = new Map(
  Object.entries({
    ene: 1, enero: 1,
    feb: 2, febrero: 2,
    mar: 3, marzo: 3,
    abr: 4, abril: 4,
    may: 5, mayo: 5,
    jun: 6, junio: 6,
    jul: 7, julio: 7,
    ago: 8, agosto: 8,
    sep: 9, sept: 9, septiembre: 9,
    oct: 10, octubre: 10,
    nov: 11, noviembre: 11,
    dic: 12, diciembre: 12,
  }),
);

function sinAcentos(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function iso(anio, mes, dia) {
  if (!(mes >= 1 && mes <= 12)) return null;
  if (!(dia >= 1 && dia <= diasDelMes(anio, mes))) return null;
  return `${String(anio).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function diasDelMes(anio, mes) {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/**
 * Interpreta una fecha en cualquiera de los formatos que aparecen en los
 * extractos. `anioPorDefecto` se usa cuando el texto no trae año ("jun 01"),
 * que es justo el caso de la cuenta en dólares.
 *
 * Devuelve "AAAA-MM-DD" o null.
 */
export function parseSpanishDate(input, { anioPorDefecto = null } = {}) {
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return iso(input.getUTCFullYear(), input.getUTCMonth() + 1, input.getUTCDate());
  }
  if (typeof input !== "string") return null;

  const texto = sinAcentos(input.trim().toLowerCase())
    .replace(/\s+/g, " ")
    // Puntuación colgando al final ("jun 19.", "01 feb. 2026,"): en la hoja
    // aparece de verdad, y por una sola fila así se descuadra el mes entero.
    .replace(/[.,;]+$/, "");
  if (!texto) return null;

  // 2026-02-01
  const isoDirecto = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoDirecto) {
    return iso(Number(isoDirecto[1]), Number(isoDirecto[2]), Number(isoDirecto[3]));
  }

  // 01/02/2026 o 01-02-26 (día primero, como se usa en Colombia)
  const conBarras = texto.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (conBarras) {
    const anio = Number(conBarras[3]);
    return iso(anio < 100 ? 2000 + anio : anio, Number(conBarras[2]), Number(conBarras[1]));
  }

  // 01 feb. 2026 / 01 feb 2026 / 01 de febrero de 2026
  const diaMesAnio = texto.match(/^(\d{1,2})\s*(?:de\s+)?([a-z]+)\.?\s*(?:de\s+)?(\d{4})?$/);
  if (diaMesAnio) {
    const mes = MESES.get(diaMesAnio[2]);
    const anio = diaMesAnio[3] ? Number(diaMesAnio[3]) : anioPorDefecto;
    if (mes && anio) return iso(anio, mes, Number(diaMesAnio[1]));
  }

  // jun 01 / jun. 01 2026 (mes primero, sin año: la cuenta en dólares)
  const mesDiaAnio = texto.match(/^([a-z]+)\.?\s*(\d{1,2})\s*,?\s*(\d{4})?$/);
  if (mesDiaAnio) {
    const mes = MESES.get(mesDiaAnio[1]);
    const anio = mesDiaAnio[3] ? Number(mesDiaAnio[3]) : anioPorDefecto;
    if (mes && anio) return iso(anio, mes, Number(mesDiaAnio[2]));
  }

  return null;
}

/** Extrae { anio, mes } de una fecha ISO. */
export function periodoDe(fechaIso) {
  const [anio, mes] = fechaIso.split("-").map(Number);
  return { anio, mes };
}

/** Nombre del mes en español, para títulos de reportes. */
export function nombreDelMes(mes) {
  const nombres = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return nombres[mes - 1] ?? "";
}

/** Valida y normaliza un par año/mes que llega por la API. */
export function normalizarPeriodo(anio, mes) {
  const a = Number.parseInt(anio, 10);
  const m = Number.parseInt(mes, 10);

  if (!Number.isInteger(a) || a < 2000 || a > 2100) return null;
  if (!Number.isInteger(m) || m < 1 || m > 12) return null;

  return { anio: a, mes: m };
}
