// Perfiles de banco.
//
// Cada perfil describe cómo lee UN banco, de forma declarativa. Cuando el banco
// cambie el formato del extracto —ya pasó una vez, en julio el encabezado pasó
// de "Fecha" a "Fecha operación"— se toca un perfil, no el motor.
//
// Un perfil no necesita acertar en todo: lo que produce siempre pasa por la
// pantalla de revisión antes de entrar a la contabilidad.

/**
 * Forma de un perfil:
 *
 *   id            identificador estable
 *   nombre        cómo se muestra en el portal
 *   moneda        COP o USD
 *   detectar      textos que, si aparecen en el PDF, señalan a este banco
 *   fecha         expresión que captura la fecha al principio de la fila, para
 *                 los extractos donde el importe es lo último de la línea
 *   fila          alternativa a `fecha`: expresión que descompone la línea
 *                 entera. Necesaria cuando el importe va en medio, con más
 *                 columnas detrás (equivalencias, comercio...)
 *   campos        qué grupo de `fila` es cada cosa
 *   ignorar       filas que nunca son movimientos (cabeceras, pies, totales)
 *   saldoDeclarado  cómo encontrar el total que el propio extracto afirma,
 *                   para poder avisar de un descuadre
 */

const IGNORAR_COMUNES = [
  /^p[áa]gina\s+\d+/i,
  /^fecha\s+(de\s+)?(operaci[óo]n|descripci[óo]n)/i,
  /^(descripci[óo]n|concepto|valor|saldo|d[ée]bito|cr[ée]dito)$/i,
  /^total(es)?\b/i,
  /^suma total/i,
  /^saldo (inicial|final|anterior|disponible)/i,
  /^extracto\b/i,
  /^resumen\b/i,
  /^nit\b/i,
  /^(cliente|titular|cuenta n)/i,
];

export const PERFILES = [
  {
    id: "cop-lulo",
    nombre: "Lulo Bank · cuenta de ahorros en pesos",
    moneda: "COP",
    detectar: [/lulo\s*bank/i, /transferencia bre-b/i, /transferencia bolsillo/i],
    // "135934138  01 jun. 2026  01 jun. 2026  Abono intereses mes anterior  + 29.81"
    //  nº         operación     autorización  descripción                   valor
    //
    // La línea empieza por el número de transacción, no por la fecha, y trae
    // dos fechas: se usa la de operación, que es cuando movió el dinero.
    //
    // La descripción es OPCIONAL: cuando es larga, el PDF la parte y la deja en
    // las líneas de arriba y abajo ("Ajuste compra no presencial" / "nacional").
    // Si se exigiera, se perderían decenas de movimientos por mes.
    fila: new RegExp(
      "^\\d+\\s+" +
        "(\\d{1,2}\\s+[a-záéíóú]{3,10}\\.?\\s+\\d{4})\\s+" + // fecha de operación
        "\\d{1,2}\\s+[a-záéíóú]{3,10}\\.?\\s+\\d{4}\\s+" + // fecha de autorización
        "(.*?)\\s*" + // descripción, si cupo en esta línea
        "([+-]\\s*[\\d.,]+)$", // valor con su signo
      "i",
    ),
    campos: { fecha: 1, tipo: 2, importe: 3, descripcion: null },
    ignorar: [
      ...IGNORAR_COMUNES,
      /^no\.\s+fecha\s+operaci[óo]n/i,
      /^en lulo bank nunca/i,
      /^defensor del consumidor/i,
      /^conoce m[áa]s sobre/i,
      /^lulo bank nit/i,
      /^pregunta nos puedes contactar/i,
      /^atenci[óo]n y radicaci[óo]n/i,
      /^carrera 11 a no/i,
    ],
    // Cuadro de totales del propio extracto, para detectar filas perdidas.
    resumenDeclarado: {
      ingresos: /Operaciones\s+Intereses pagados\s+Operaciones\s+Impuestos\s+Saldo al corte\s*\$?\s*([\d.,]+)/i,
      gastos: /Operaciones\s+Intereses pagados\s+Operaciones\s+Impuestos\s+Saldo al corte\s*\$?[\d.,]+\s+\$?[\d.,]+\s+\$?([\d.,]+)/i,
    },
    saldoDeclarado: null,
  },
  {
    id: "usd-dolarapp",
    nombre: "Dólarapp · estado de cuenta en dólares",
    moneda: "USD",
    detectar: [/d[óo]lares digitales/i, /d[óo]larapp/i, /arqfinance/i, /compra usdc/i],
    // "Jun 01 Compra USDc + 3.5 COP + 12,469 Lulo Bank"
    //  fecha  tipo         monto  moneda  equivalente  comercio
    //
    // El movimiento es el PRIMER importe: el segundo es su equivalencia en la
    // moneda local, y sumar esa columna daría un mes en pesos, no en dólares.
    //
    // Las comisiones no tienen equivalencia y escriben "N/A N/A"; si no se
    // aceptara, se perderían justo los cobros del banco.
    fila: /^([a-z]{3}\.?\s+\d{1,2})\s+(.*?)\s*([+-]\s*\d[\d.,]*)\s+(?:COP|USD|N\/A)\s+(?:[+-]\s*\d[\d.,]*|N\/A)\s*(.*)$/i,
    campos: { fecha: 1, tipo: 2, importe: 3, descripcion: 4 },
    ignorar: IGNORAR_COMUNES,
    // El extracto declara sus propios totales; sirven para avisar de descuadres.
    resumenDeclarado: {
      ingresos: /Ingresos\s*\$\s*([\d.,]+)/i,
      gastos: /Retiros\s*\$\s*([\d.,]+)/i,
    },
    saldoDeclarado: null,
  },
  {
    // Red de seguridad: cualquier PDF cuya fila empiece por algo que parezca
    // una fecha y termine en algo que parezca un importe.
    id: "generico-tabular",
    nombre: "Genérico · fecha al inicio, importe al final",
    moneda: null,
    detectar: [],
    fecha: /^(\d{1,2}\s+[a-záéíóú]{3,10}\.?\s*(?:\d{4})?|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|[a-záéíóú]{3,10}\.?\s+\d{1,2})\s+(.*)$/i,
    ignorar: IGNORAR_COMUNES,
    saldoDeclarado: null,
  },
];

export function perfilPorId(id) {
  return PERFILES.find((perfil) => perfil.id === id) ?? null;
}

/**
 * Elige el perfil que mejor encaja con el texto del PDF, por puntaje.
 * El genérico solo gana si ningún otro puntúa.
 */
export function detectarPerfil(texto, { monedaEsperada = null } = {}) {
  const candidatos = PERFILES.filter((perfil) => perfil.id !== "generico-tabular")
    .map((perfil) => {
      const evidencias = perfil.detectar.filter((patron) => patron.test(texto)).length;

      // Sin ninguna señal en el propio documento no se elige un banco concreto.
      // La moneda por sí sola no basta: leería el extracto de otro banco en
      // pesos con el formato equivocado y lo dejaría vacío sin decir por qué.
      if (evidencias === 0) return null;

      let puntaje = evidencias;

      // La moneda de la cuenta desempata: un extracto en dólares subido a una
      // cuenta en pesos casi siempre es un error de quien lo sube.
      if (monedaEsperada && perfil.moneda === monedaEsperada) puntaje += 1;
      if (monedaEsperada && perfil.moneda && perfil.moneda !== monedaEsperada) puntaje -= 2;

      return { perfil, puntaje };
    })
    .filter((candidato) => candidato && candidato.puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje);

  if (candidatos.length === 0) {
    return { perfil: perfilPorId("generico-tabular"), puntaje: 0, seguro: false };
  }

  const mejor = candidatos[0];
  const segundo = candidatos[1];

  return {
    perfil: mejor.perfil,
    puntaje: mejor.puntaje,
    // "Seguro" significa que le saca ventaja clara al siguiente candidato.
    seguro: !segundo || mejor.puntaje - segundo.puntaje >= 2,
  };
}
