// Dinero.
//
// Regla número uno: nunca se usa coma flotante. 0.1 + 0.2 no da 0.3, y en un
// libro de cuentas eso se acumula hasta descuadrar el mes. Todo son enteros de
// centavos, y la conversión desde texto se hace manipulando cadenas, sin pasar
// jamás por parseFloat.
//
// Los extractos mezclan formatos: el banco escribe "1.234.567,89" (estilo
// colombiano) y la hoja de cálculo exporta "1,234,567.89" (estilo inglés). Hay
// que aceptar los dos sin adivinar mal.

const SOLO_BASURA = /[^\d,.\-+()]/g;

/**
 * Convierte texto de importe a centavos enteros.
 * Devuelve null si el texto no contiene un número reconocible.
 *
 *   "$41,900"       →   4190000
 *   "\-35.700,00"   →  -3570000
 *   "38.09"         →      3809
 *   "(1.200)"       →   -120000
 */
export function parseAmountToCents(input) {
  if (typeof input === "number" && Number.isFinite(input)) {
    return Math.round(input * 100);
  }
  if (typeof input !== "string") return null;

  let texto = input.trim();
  if (!texto) return null;

  // Los extractos en PDF y las exportaciones a Markdown escapan el menos.
  texto = texto.replace(/\\/g, "");

  // Contabilidad clásica: los negativos entre paréntesis.
  const entreParentesis = /^\(.*\)$/.test(texto.replace(SOLO_BASURA, "").trim());

  const limpio = texto.replace(SOLO_BASURA, "");
  if (!limpio) return null;

  const negativo = entreParentesis || /-/.test(limpio.replace(/[()]/g, ""));
  const digitosYSeparadores = limpio.replace(/[()\-+]/g, "");
  if (!/\d/.test(digitosYSeparadores)) return null;

  const ultimaComa = digitosYSeparadores.lastIndexOf(",");
  const ultimoPunto = digitosYSeparadores.lastIndexOf(".");
  const posicionDecimal = Math.max(ultimaComa, ultimoPunto);

  let enteros;
  let decimales;

  if (posicionDecimal === -1) {
    enteros = digitosYSeparadores;
    decimales = "";
  } else {
    const cola = digitosYSeparadores.slice(posicionDecimal + 1);
    const parteEntera = digitosYSeparadores.slice(0, posicionDecimal);
    const hayDosSeparadoresDistintos = ultimaComa !== -1 && ultimoPunto !== -1;

    // Un separador de miles siempre deja exactamente tres cifras detrás. Con
    // cualquier otra cantidad (1, 2, 4...) es decimal sin lugar a dudas.
    let esDecimal;

    if (!/^\d+$/.test(cola)) {
      esDecimal = false;
    } else if (hayDosSeparadoresDistintos) {
      // "5,051,855.00" o "1.234.567,89": el último separador es el decimal.
      esDecimal = true;
    } else if (cola.length !== 3) {
      esDecimal = true;
    } else {
      // Tres cifras y un solo tipo de separador: "24.900" es ambiguo. En pesos
      // la lectura correcta es miles, que es como lo escriben el banco y la
      // hoja. Solo se lee como decimal si la parte entera es cero ("0.005") o
      // no existe (",005"): nadie agrupa miles empezando por cero.
      const yaHabiaSeparador = /[.,]/.test(parteEntera);
      const enteroEsCero = /^0*$/.test(parteEntera.replace(/\D/g, ""));
      esDecimal = !yaHabiaSeparador && enteroEsCero;
    }

    if (esDecimal && cola.length > 0) {
      enteros = digitosYSeparadores.slice(0, posicionDecimal);
      decimales = cola;
    } else {
      enteros = digitosYSeparadores;
      decimales = "";
    }
  }

  enteros = enteros.replace(/\D/g, "");
  decimales = decimales.replace(/\D/g, "");

  if (!enteros && !decimales) return null;

  // Se redondea a dos cifras mirando la tercera, sin dividir nada.
  let centavos = decimales.slice(0, 2).padEnd(2, "0");
  if (decimales.length > 2 && Number(decimales[2]) >= 5) {
    centavos = String(Number(centavos) + 1).padStart(2, "0");
    if (centavos.length > 2) {
      // El redondeo se llevó una unidad al entero (por ejemplo ,999 → +1,00).
      enteros = String(BigInt(enteros || "0") + 1n);
      centavos = "00";
    }
  }

  const total = BigInt(enteros || "0") * 100n + BigInt(centavos);
  const resultado = Number(negativo ? -total : total);

  if (!Number.isSafeInteger(resultado)) return null;
  return resultado;
}

/** Centavos → texto con dos decimales. Para exportar a CSV. */
export function formatCents(cents) {
  const negativo = cents < 0;
  const absoluto = Math.abs(cents);
  const enteros = Math.trunc(absoluto / 100);
  const resto = String(absoluto % 100).padStart(2, "0");
  return `${negativo ? "-" : ""}${enteros}.${resto}`;
}

/** Centavos → texto legible en español, con símbolo. */
export function formatMoney(cents, currency = "COP") {
  const valor = Number(cents) / 100;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "COP" ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/** Suma segura de centavos; avisa si se sale del rango entero exacto. */
export function sumCents(valores) {
  const total = valores.reduce((acumulado, valor) => acumulado + BigInt(valor), 0n);
  const numero = Number(total);

  if (!Number.isSafeInteger(numero)) {
    throw new Error("La suma supera el rango de enteros exactos de JavaScript.");
  }
  return numero;
}
