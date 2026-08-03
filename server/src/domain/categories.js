// Clasificación automática de movimientos.
//
// El banco repite las mismas descripciones mes tras mes ("Compra no presencial
// nacional", "Transferencia Bre-B", "Pago PSE ..."), que es justo lo que hoy
// agrupas a mano en el pivot. Estas reglas hacen ese trabajo al importar, y se
// pueden corregir desde Ajustes sin tocar código.

import { normalizarDescripcion } from "./movements.js";

/**
 * Devuelve la categoría de una descripción, o null si ninguna regla aplica.
 * Las reglas llegan ordenadas por prioridad (menor número, más específica).
 */
export function clasificar(descripcion, direccion, reglas) {
  const texto = normalizarDescripcion(descripcion);

  for (const regla of reglas) {
    if (regla.active === false) continue;
    if (regla.direction && regla.direction !== direccion) continue;

    if (coincide(texto, regla)) return regla.category;
  }

  return null;
}

function coincide(texto, regla) {
  const patron = normalizarDescripcion(regla.pattern);

  switch (regla.match_type) {
    case "igual":
      return texto === patron;
    case "empieza":
      return texto.startsWith(patron);
    case "regex":
      try {
        // Las reglas las escribe el propietario del portal, no un desconocido,
        // pero una expresión mal formada no debe tumbar una importación entera.
        return new RegExp(regla.pattern, "i").test(texto);
      } catch {
        return false;
      }
    case "contiene":
    default:
      return texto.includes(patron);
  }
}

/**
 * Reglas iniciales, sacadas de las descripciones que ya aparecen en tu hoja.
 * Son un punto de partida editable, no algo fijo.
 */
export const REGLAS_INICIALES = [
  // Movimientos entre cuentas propias: no son gasto ni ingreso de verdad, y
  // conviene verlos aparte para que no inflen el mes.
  { pattern: "transferencia bolsillo", category: "Traslado entre bolsillos", priority: 10 },
  { pattern: "retiro bolsillo", category: "Traslado entre bolsillos", priority: 10 },
  { pattern: "transferencia lulo", category: "Traslado entre cuentas", priority: 12 },

  // Ingresos.
  { pattern: "deposito ach", category: "Nómina y depósitos", priority: 20, direction: "ingreso" },
  { pattern: "depósito ach", category: "Nómina y depósitos", priority: 20, direction: "ingreso" },
  { pattern: "abono intereses", category: "Rendimientos", priority: 20, direction: "ingreso" },
  { pattern: "cashback", category: "Cashback y devoluciones", priority: 20, direction: "ingreso" },
  { pattern: "ajuste", category: "Cashback y devoluciones", priority: 25, direction: "ingreso" },
  { pattern: "contracargo", category: "Cashback y devoluciones", priority: 25, direction: "ingreso" },

  // Deuda y tarjetas.
  { pattern: "pago de tarjeta", category: "Pago de tarjeta", priority: 30 },
  { pattern: "pago tarjeta", category: "Pago de tarjeta", priority: 30 },
  { pattern: "pago de credito", category: "Pago de créditos", priority: 30 },
  { pattern: "pago de crédito", category: "Pago de créditos", priority: 30 },

  // Servicios que ya identificas por el comercio.
  { pattern: "pago pse eaab", category: "Servicios · agua", priority: 40 },
  { pattern: "pago pse vanti", category: "Servicios · gas", priority: 40 },
  { pattern: "pago pse claro", category: "Servicios · telefonía", priority: 40 },

  // Conceptos que ya aparecen por su nombre en tu presupuesto fijo.
  { pattern: "arriendo", category: "Vivienda", priority: 35 },
  { pattern: "nomina", category: "Nómina y depósitos", priority: 35, direction: "ingreso" },
  { pattern: "nómina", category: "Nómina y depósitos", priority: 35, direction: "ingreso" },
  { pattern: "mercado", category: "Mercado", priority: 45 },
  { pattern: "spotify", category: "Suscripciones", priority: 45 },
  { pattern: "netflix", category: "Suscripciones", priority: 45 },
  { pattern: "prime video", category: "Suscripciones", priority: 45 },
  { pattern: "crunchyroll", category: "Suscripciones", priority: 45 },
  { pattern: "chatgpt", category: "Suscripciones", priority: 45 },
  { pattern: "claude", category: "Suscripciones", priority: 45 },
  { pattern: "discord", category: "Suscripciones", priority: 45 },
  { pattern: "youtube", category: "Suscripciones", priority: 45 },
  { pattern: "yt premium", category: "Suscripciones", priority: 45 },

  // Genéricas: van al final para que las de arriba manden.
  { pattern: "pago pse", category: "Pagos PSE", priority: 60 },
  { pattern: "compra presencial internacional", category: "Compras internacionales", priority: 70 },
  { pattern: "compra no presencial internacional", category: "Compras internacionales", priority: 70 },
  { pattern: "comision spread", category: "Comisiones", priority: 70 },
  { pattern: "comisión spread", category: "Comisiones", priority: 70 },
  { pattern: "comision", category: "Comisiones", priority: 75 },
  { pattern: "compra presencial nacional", category: "Compras nacionales", priority: 80 },
  { pattern: "compra no presencial nacional", category: "Compras en línea", priority: 80 },
  { pattern: "retiro sin tarjeta", category: "Retiros en efectivo", priority: 80 },
  { pattern: "transferencia bre-b", category: "Transferencias", priority: 90 },
];
