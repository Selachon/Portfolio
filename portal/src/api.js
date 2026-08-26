// Cliente de la API.
//
// Mismo origen que el portal, así que la cookie de sesión viaja sola y no hace
// falta CORS ni cabeceras de autorización.

export class ErrorApi extends Error {
  constructor(mensaje, estado, detalles) {
    super(mensaje);
    this.estado = estado;
    this.detalles = detalles;
  }
}

async function procesar(respuesta) {
  if (respuesta.status === 204) return null;

  const tipo = respuesta.headers.get("content-type") ?? "";

  if (!tipo.includes("application/json")) {
    if (!respuesta.ok) throw new ErrorApi("Error del servidor.", respuesta.status);
    return respuesta;
  }

  const cuerpo = await respuesta.json();

  if (!respuesta.ok) {
    throw new ErrorApi(
      cuerpo?.error?.mensaje ?? "Algo salió mal.",
      respuesta.status,
      cuerpo?.error?.detalles,
    );
  }

  return cuerpo;
}

async function peticion(metodo, ruta, cuerpo) {
  const opciones = { method: metodo, credentials: "same-origin", headers: {} };

  if (cuerpo instanceof FormData) {
    opciones.body = cuerpo;
  } else if (cuerpo !== undefined) {
    opciones.headers["content-type"] = "application/json";
    opciones.body = JSON.stringify(cuerpo);
  }

  return procesar(await fetch(ruta, opciones));
}

export const api = {
  get: (ruta) => peticion("GET", ruta),
  post: (ruta, cuerpo) => peticion("POST", ruta, cuerpo),
  put: (ruta, cuerpo) => peticion("PUT", ruta, cuerpo),
  patch: (ruta, cuerpo) => peticion("PATCH", ruta, cuerpo),
  delete: (ruta) => peticion("DELETE", ruta),

  /** Abre una descarga en una pestaña nueva (CSV, PDF). */
  descargar(ruta) {
    window.open(ruta, "_blank", "noopener,noreferrer");
  },
};

// ── Formato ────────────────────────────────────────────────────────────────

const FORMATO = {
  COP: new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", minimumFractionDigits: 2 }),
};

/** Centavos → texto de dinero. Nunca se hacen cuentas con el resultado. */
export function dinero(centavos, moneda = "COP") {
  if (centavos === null || centavos === undefined) return "—";

  // Varias pantallas muestran un saldo negado (`-restante`) para pintarlo en
  // rojo. Cuando ese saldo llega a cero el resultado es -0, y el formateador lo
  // imprime como "-$ 0": una deuda saldada no puede verse como si debiera algo.
  // Se normaliza SOLO el cero con signo: un valor corrupto debe seguir
  // viéndose corrupto en pantalla en vez de disfrazarse de cero.
  const valor = Number(centavos) / 100;

  return (FORMATO[moneda] ?? FORMATO.COP).format(valor === 0 ? 0 : valor);
}

export function fechaLegible(iso) {
  if (!iso) return "—";
  const [anio, mes, dia] = String(iso).slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}

export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function nombreMes(mes) {
  return MESES[mes - 1] ?? "";
}
