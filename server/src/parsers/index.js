// Motor de lectura de extractos.
//
// Toma el texto ya reconstruido en filas y produce movimientos candidatos, cada
// uno con sus avisos. Es deliberadamente conservador: prefiere marcar una fila
// como dudosa a inventarse un importe. Nada de lo que sale de aquí entra a la
// contabilidad sin pasar por la pantalla de revisión.

import { parseSpanishDate } from "../domain/dates.js";
import { parseAmountToCents } from "../domain/money.js";
import { extraerFilas, textoPlano } from "./pdfText.js";
import { detectarPerfil, perfilPorId } from "./profiles.js";

// Un importe al final de la fila: "1.234.567,89", "-35,700.00", "(1.200)".
const IMPORTE_AL_FINAL = /(-?\(?\$?\s?[\d][\d.,]*\)?)\s*$/;
// Un segundo importe antes del primero suele ser el saldo corriente.
const DOS_IMPORTES_AL_FINAL = /(-?\(?\$?\s?[\d][\d.,]*\)?)\s+(-?\(?\$?\s?[\d][\d.,]*\)?)\s*$/;

function esFilaIgnorable(texto, perfil) {
  return perfil.ignorar.some((patron) => patron.test(texto));
}

/**
 * Lee las filas de texto con un perfil concreto.
 * Devuelve { filas, avisos, sinReconocer }.
 */
export function leerConPerfil(filasTexto, perfil, { anioPorDefecto = null } = {}) {
  if (perfil.fila) return leerPorColumnas(filasTexto, perfil, { anioPorDefecto });

  const filas = [];
  const sinReconocer = [];

  for (const texto of filasTexto) {
    if (!texto || esFilaIgnorable(texto, perfil)) continue;

    const coincidencia = texto.match(perfil.fecha);
    if (!coincidencia) continue;

    const occurredOn = parseSpanishDate(coincidencia[1], { anioPorDefecto });
    if (!occurredOn) {
      sinReconocer.push({ texto, motivo: "no se entendió la fecha" });
      continue;
    }

    const resto = coincidencia[2] ?? "";

    // Muchos extractos ponen el movimiento y, detrás, el saldo de la cuenta.
    // El movimiento es el primero de los dos.
    const dos = resto.match(DOS_IMPORTES_AL_FINAL);
    const uno = resto.match(IMPORTE_AL_FINAL);

    const textoImporte = dos ? dos[1] : uno?.[1];
    if (!textoImporte) {
      sinReconocer.push({ texto, motivo: "no se encontró el importe" });
      continue;
    }

    const amountCents = parseAmountToCents(textoImporte);
    if (amountCents === null || amountCents === 0) {
      sinReconocer.push({ texto, motivo: "el importe no es un número válido" });
      continue;
    }

    const description = resto
      .slice(0, resto.lastIndexOf(dos ? dos[0] : uno[0]))
      .replace(/\s+/g, " ")
      .trim();

    const avisos = [];
    if (!description) avisos.push("Sin descripción.");
    if (dos) avisos.push("La fila traía dos importes; se tomó el primero como movimiento.");

    filas.push({
      occurredOn,
      description: description || "(sin descripción)",
      amountCents,
      avisos,
      textoOriginal: texto,
    });
  }

  return { filas, sinReconocer };
}

/**
 * Lectura para extractos cuya línea trae el importe en medio, con más columnas
 * detrás (equivalencias en otra moneda, el comercio...). El perfil describe la
 * línea entera con una expresión y dice qué grupo es cada cosa.
 */
function leerPorColumnas(filasTexto, perfil, { anioPorDefecto }) {
  const filas = [];
  const sinReconocer = [];

  const { fecha: iFecha, tipo: iTipo, importe: iImporte, descripcion: iDescripcion } = perfil.campos;

  // Primera pasada: se localizan los trozos de descripción sueltos. Estos
  // extractos parten las descripciones largas y dejan los pedazos en la línea
  // de arriba y en la de abajo ("Ajuste compra no presencial" / "nacional"),
  // así que hay que conocerlos ANTES de recorrer las filas: mirando solo hacia
  // atrás se pierde siempre la mitad.
  const sueltas = new Map();

  for (const [indice, texto] of filasTexto.entries()) {
    if (!texto || esFilaIgnorable(texto, perfil)) continue;
    if (perfil.fila.test(texto)) continue;
    if (texto.length < 60 && !/\d/.test(texto)) sueltas.set(indice, texto);
  }

  // Cada trozo pertenece a una sola fila; una vez usado, no se reutiliza.
  const usadas = new Set();

  const tomarSuelta = (indice) => {
    if (!sueltas.has(indice) || usadas.has(indice)) return "";
    usadas.add(indice);
    return sueltas.get(indice);
  };

  for (const [indice, texto] of filasTexto.entries()) {
    if (!texto || esFilaIgnorable(texto, perfil)) continue;

    const coincidencia = texto.match(perfil.fila);
    if (!coincidencia) continue;

    const occurredOn = parseSpanishDate(coincidencia[iFecha], { anioPorDefecto });
    if (!occurredOn) {
      sinReconocer.push({ texto, motivo: "no se entendió la fecha" });
      continue;
    }

    const amountCents = parseAmountToCents(coincidencia[iImporte]);
    if (amountCents === null || amountCents === 0) {
      sinReconocer.push({ texto, motivo: "el importe no es un número válido" });
      continue;
    }

    const tipo = (coincidencia[iTipo] ?? "").trim();
    const comercio = iDescripcion ? (coincidencia[iDescripcion] ?? "").trim() : "";
    const avisos = [];

    // Cuando la descripción no cupo en la línea, se recompone con los trozos
    // de arriba y de abajo.
    let tipoCompleto = tipo;
    if (!tipoCompleto) {
      tipoCompleto = `${tomarSuelta(indice - 1)} ${tomarSuelta(indice + 1)}`.replace(/\s+/g, " ").trim();
      if (tipoCompleto) {
        avisos.push("La descripción venía partida en varias líneas; se recompuso.");
      } else {
        avisos.push("El extracto no dejó descripción legible para este movimiento.");
      }
    }

    const description = [tipoCompleto, comercio].filter(Boolean).join(" · ") || "(sin descripción)";

    filas.push({ occurredOn, description, amountCents, avisos, textoOriginal: texto });
  }

  return { filas, sinReconocer };
}

/**
 * Compara lo leído con el cuadro de totales que el propio extracto imprime.
 * Devuelve los avisos y las cifras, para poder mostrarlas en la revisión.
 */
function compararConElResumen(texto, filas, perfil) {
  const avisos = [];
  if (!perfil.resumenDeclarado) return { avisos, declarado: null };

  const leer = (expresion) => {
    if (!expresion) return null;
    const coincidencia = texto.match(expresion);
    return coincidencia ? parseAmountToCents(coincidencia[1]) : null;
  };

  const ingresosDeclarados = leer(perfil.resumenDeclarado.ingresos);
  const gastosDeclarados = leer(perfil.resumenDeclarado.gastos);

  const ingresosLeidos = filas.filter((f) => f.amountCents > 0).reduce((s, f) => s + f.amountCents, 0);
  const gastosLeidos = Math.abs(
    filas.filter((f) => f.amountCents < 0).reduce((s, f) => s + f.amountCents, 0),
  );

  const comparar = (etiqueta, declarado, leido) => {
    if (declarado === null) return;
    const diferencia = leido - declarado;
    if (diferencia !== 0) {
      avisos.push(
        `El extracto declara ${etiqueta} por ${(declarado / 100).toFixed(2)} y de su detalle ` +
          `salen ${(leido / 100).toFixed(2)} (diferencia de ${(diferencia / 100).toFixed(2)}). ` +
          "Revisa antes de confirmar.",
      );
    }
  };

  comparar("ingresos", ingresosDeclarados, ingresosLeidos);
  comparar("gastos", gastosDeclarados, gastosLeidos);

  return {
    avisos,
    declarado: {
      ingresosCentavos: ingresosDeclarados,
      gastosCentavos: gastosDeclarados,
      ingresosLeidosCentavos: ingresosLeidos,
      gastosLeidosCentavos: gastosLeidos,
    },
  };
}

/** Comprueba lo leído y devuelve avisos de conjunto. */
export function revisarLote(filas, { anio, mes, saldoDeclaradoCentavos = null }) {
  const avisos = [];

  const fueraDePeriodo = filas.filter((fila) => {
    const [a, m] = fila.occurredOn.split("-").map(Number);
    return a !== anio || m !== mes;
  });

  if (fueraDePeriodo.length > 0) {
    avisos.push(
      `${fueraDePeriodo.length} movimiento(s) tienen fecha fuera de ${String(mes).padStart(2, "0")}/${anio}. ` +
        "Revísalos: puede ser un extracto del mes equivocado.",
    );
  }

  // Todos los importes con el mismo signo casi siempre significa que el signo
  // no se está leyendo, no que el mes no tuvo ingresos.
  const positivos = filas.filter((fila) => fila.amountCents > 0).length;
  if (filas.length > 5 && (positivos === 0 || positivos === filas.length)) {
    avisos.push(
      "Todos los movimientos salieron con el mismo signo. Comprueba que se estén " +
        "distinguiendo los cargos de los abonos antes de confirmar.",
    );
  }

  if (saldoDeclaradoCentavos !== null) {
    const suma = filas.reduce((total, fila) => total + fila.amountCents, 0);
    if (suma !== saldoDeclaradoCentavos) {
      avisos.push(
        "La suma de lo leído no coincide con el total que declara el extracto. " +
          "Falta o sobra alguna fila.",
      );
    }
  }

  return avisos;
}

/**
 * Punto de entrada: de un PDF a movimientos candidatos.
 * No escribe nada en la base de datos.
 */
export async function leerExtracto(
  buffer,
  { anio, mes, moneda = null, perfilForzado = null, contrasena = null } = {},
) {
  const paginas = await extraerFilas(buffer, { contrasena });
  const texto = textoPlano(paginas);
  const filasTexto = paginas.flatMap((pagina) => pagina.filas.map((fila) => fila.texto));

  const deteccion = perfilForzado
    ? { perfil: perfilPorId(perfilForzado), puntaje: null, seguro: true }
    : detectarPerfil(texto, { monedaEsperada: moneda });

  if (!deteccion.perfil) {
    return {
      perfil: null,
      filas: [],
      avisos: ["No se reconoció el formato del extracto."],
      textoExtraido: texto,
      sinReconocer: [],
    };
  }

  let { filas, sinReconocer } = leerConPerfil(filasTexto, deteccion.perfil, {
    anioPorDefecto: anio,
  });

  const avisos = [];

  // El perfil se elige por el texto del documento, pero el banco puede haber
  // cambiado la maquetación: entonces acierta el nombre y no lee ni una fila.
  // Antes de rendirse se prueba el perfil genérico, y se avisa de que pasó.
  if (filas.length === 0 && deteccion.perfil.id !== "generico-tabular") {
    const generico = perfilPorId("generico-tabular");
    const reintento = leerConPerfil(filasTexto, generico, { anioPorDefecto: anio });

    if (reintento.filas.length > 0) {
      avisos.push(
        `El perfil "${deteccion.perfil.nombre}" no reconoció ninguna fila, así que se leyó ` +
          "con el perfil genérico. Puede que el banco haya cambiado el formato del extracto: " +
          "revisa las filas con cuidado.",
      );
      deteccion.perfil = generico;
      ({ filas, sinReconocer } = reintento);
    }
  }

  if (!deteccion.seguro) {
    avisos.push(
      `No se pudo identificar el banco con seguridad; se leyó con el perfil "${deteccion.perfil.nombre}". ` +
        "Revisa las filas con calma.",
    );
  }

  if (filas.length === 0) {
    avisos.push(
      "No se reconoció ningún movimiento. Puede ser un PDF escaneado (una imagen, sin texto): " +
        "en ese caso pega la tabla a mano desde el importador.",
    );
  }

  let saldoDeclaradoCentavos = null;
  if (deteccion.perfil.saldoDeclarado) {
    const coincidencia = texto.match(deteccion.perfil.saldoDeclarado);
    if (coincidencia) saldoDeclaradoCentavos = parseAmountToCents(coincidencia[1]);
  }

  avisos.push(...revisarLote(filas, { anio, mes, saldoDeclaradoCentavos }));

  // Muchos extractos traen su propio cuadro de totales. Compararlo con lo leído
  // es la mejor red de seguridad que hay: si falta una fila, se nota aquí.
  const declarado = compararConElResumen(texto, filas, deteccion.perfil);
  avisos.push(...declarado.avisos);

  if (sinReconocer.length > 0) {
    avisos.push(
      `${sinReconocer.length} línea(s) parecían un movimiento pero no se pudieron leer. ` +
        "Aparecen listadas para que las revises.",
    );
  }

  return {
    perfil: { id: deteccion.perfil.id, nombre: deteccion.perfil.nombre },
    filas,
    avisos,
    sinReconocer,
    declarado: declarado.declarado,
    textoExtraido: texto,
    paginas: paginas.length,
  };
}
