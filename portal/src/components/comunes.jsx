// Piezas de interfaz que se repiten en todas las pantallas.
//
// Siguen el lenguaje visual del sitio público: esquinas vivas, líneas finas,
// monoespaciada en versalitas para las etiquetas.

import { cloneElement, isValidElement, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { dinero } from "../api.js";

const FORMATO_ENTERO = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

export function Cargando({ texto = "Cargando" }) {
  return <div className="cargando">{texto}</div>;
}

/** Las cuatro marcas de esquina que firman los paneles del sitio. */
function Esquinas() {
  return (
    <>
      <span className="panel__esquina tl" />
      <span className="panel__esquina tr" />
      <span className="panel__esquina bl" />
      <span className="panel__esquina br" />
    </>
  );
}

export function Panel({ titulo, extra, esquinas = false, plano = false, className = "", style, children }) {
  return (
    <section className={`panel ${plano ? "panel--plano" : ""} ${className}`.trim()} style={style}>
      {esquinas && <Esquinas />}
      {(titulo || extra) && (
        <header className="panel__head">
          <h3>{titulo}</h3>
          {extra}
        </header>
      )}
      {children}
    </section>
  );
}

/**
 * Línea de contexto sobre el título, con el mismo aire que el sitio: una
 * secuencia de etiquetas en monoespaciada separadas por barras.
 */
export function MetaLinea({ partes = [] }) {
  return (
    <div className="metaline">
      <span className="marcador">■</span>
      {partes.map((parte, indice) => (
        <span key={parte}>
          {indice > 0 && <span className="sep" style={{ marginRight: 14 }}>/</span>}
          <span className="mono-uppr">{parte}</span>
        </span>
      ))}
    </div>
  );
}

export function Aviso({ tipo = "atencion", children }) {
  if (!children) return null;

  const Icono = tipo === "error" ? AlertTriangle : tipo === "ok" ? CheckCircle2 : Info;
  return (
    <div className={`aviso aviso--${tipo}`} role={tipo === "error" ? "alert" : undefined}>
      <Icono size={15} />
      <div>{children}</div>
    </div>
  );
}

export function NumeroAnimado({ valor, formatear, sufijo = "", duracion = 760 }) {
  const objetivo = Number(valor);
  const numeroSeguro = Number.isFinite(objetivo) ? objetivo : 0;
  const [mostrado, setMostrado] = useState(0);
  const mostradoRef = useRef(0);
  const [direccion, setDireccion] = useState("sube");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const inicio = mostradoRef.current;
    const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    setDireccion(numeroSeguro >= inicio ? "sube" : "baja");
    setRevision((actual) => actual + 1);

    if (movimientoReducido || inicio === numeroSeguro) {
      mostradoRef.current = numeroSeguro;
      setMostrado(numeroSeguro);
      return undefined;
    }

    const empezo = performance.now();
    let cuadro;

    const avanzar = (ahora) => {
      const progreso = Math.min((ahora - empezo) / duracion, 1);
      const suavizado = 1 - (1 - progreso) ** 4;
      const actual = inicio + (numeroSeguro - inicio) * suavizado;

      mostradoRef.current = actual;
      setMostrado(actual);

      if (progreso < 1) {
        cuadro = requestAnimationFrame(avanzar);
      } else {
        mostradoRef.current = numeroSeguro;
        setMostrado(numeroSeguro);
      }
    };

    cuadro = requestAnimationFrame(avanzar);
    return () => cancelAnimationFrame(cuadro);
  }, [duracion, numeroSeguro]);

  const presentar = formatear ?? ((numero) => FORMATO_ENTERO.format(Math.round(numero)));
  const textoFinal = `${presentar(numeroSeguro)}${sufijo}`;
  const textoMostrado = `${presentar(mostrado)}${sufijo}`;

  return (
    <span className={`numero-animado numero-animado--${direccion}`} aria-label={textoFinal}>
      <span className="numero-animado__reserva" aria-hidden="true">{textoFinal}</span>
      <span key={revision} className="numero-animado__valor" aria-hidden="true">
        {textoMostrado}
      </span>
    </span>
  );
}

export function Kpi({ etiqueta, valor, numero, sufijo = "", moneda = "COP", centavos, pie, tono }) {
  const esDinero = centavos !== undefined;
  const entradaNumerica = esDinero ? centavos : numero;
  const numeroAnimable = Number(entradaNumerica);
  const sePuedeAnimar = entradaNumerica !== null
    && entradaNumerica !== undefined
    && Number.isFinite(numeroAnimable);
  const clase = tono ?? (centavos === undefined ? "" : centavos < 0 ? "negativo" : "positivo");

  return (
    <div className="kpi">
      <Esquinas />
      <div className="kpi__etiqueta">{etiqueta}</div>
      <div className={`kpi__valor ${clase}`}>
        {sePuedeAnimar ? (
          <NumeroAnimado
            key={esDinero ? moneda : sufijo}
            valor={numeroAnimable}
            sufijo={sufijo}
            formatear={esDinero ? (actual) => dinero(actual, moneda) : undefined}
          />
        ) : (
          esDinero ? dinero(centavos, moneda) : valor
        )}
      </div>
      {pie && <div className="kpi__pie">{pie}</div>}
    </div>
  );
}

/** Barra de proporción bajo una cifra. Nunca es el único dato: acompaña. */
export function Barra({ porcentaje }) {
  return (
    <div className="barra">
      <span style={{ width: `${Math.max(Math.min(porcentaje, 100), 1)}%` }} />
    </div>
  );
}

export function Modal({ titulo, ancho = false, alCerrar, children }) {
  const tituloId = useId();
  const modalRef = useRef(null);

  useEffect(() => {
    const focoAnterior = document.activeElement;
    const modal = modalRef.current;
    const enfocables = () => [...modal.querySelectorAll(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
    )];

    const alPulsar = (evento) => {
      if (evento.key === "Escape") alCerrar();
      if (evento.key !== "Tab") return;

      const elementos = enfocables();
      if (elementos.length === 0) {
        evento.preventDefault();
        modal.focus();
        return;
      }

      const primero = elementos[0];
      const ultimo = elementos.at(-1);
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };

    window.addEventListener("keydown", alPulsar);
    requestAnimationFrame(() => {
      const preferido = modal.querySelector("[autofocus]") ?? enfocables()[0] ?? modal;
      preferido.focus();
    });

    return () => {
      window.removeEventListener("keydown", alPulsar);
      if (focoAnterior instanceof HTMLElement) focoAnterior.focus();
    };
  }, [alCerrar]);

  return (
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}>
      <div
        ref={modalRef}
        className={`modal ${ancho ? "modal--ancho" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
      >
        <Esquinas />
        <div className="modal__cabecera">
          <h2 id={tituloId}>{titulo}</h2>
          <button className="icono" onClick={alCerrar} aria-label="Cerrar">
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Campo({ etiqueta, className = "", style, children }) {
  const generado = useId();
  const id = isValidElement(children) ? (children.props.id ?? generado) : generado;
  const control = isValidElement(children) ? cloneElement(children, { id }) : children;

  return (
    <div className={`campo ${className}`.trim()} style={style}>
      <label htmlFor={id}>{etiqueta}</label>
      {control}
    </div>
  );
}

export function TablaVacia({ columnas, texto }) {
  return (
    <tr>
      <td colSpan={columnas} className="vacio">
        {texto}
      </td>
    </tr>
  );
}

/**
 * Confirmación para acciones que no se pueden deshacer.
 * Se pide escribir la palabra exacta: un clic de más no debería borrar un mes.
 */
export function ConfirmarBorrado({ que, palabra = "BORRAR", alConfirmar, alCerrar }) {
  const [texto, setTexto] = useState("");

  return (
    <Modal titulo="Confirmar" alCerrar={alCerrar}>
      <Aviso tipo="error">
        Vas a borrar <strong>{que}</strong>. Esto no se puede deshacer.
      </Aviso>
      <Campo etiqueta={`Escribe ${palabra} para confirmar`}>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus />
      </Campo>
      <div className="acciones">
        <button className="peligro" disabled={texto !== palabra} onClick={alConfirmar}>
          Borrar definitivamente
        </button>
        <button onClick={alCerrar}>Cancelar</button>
      </div>
    </Modal>
  );
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Selector de periodo (año y mes) reutilizado en varias pantallas. */
export function SelectorPeriodo({ anio, mes, alCambiar }) {
  const mesId = useId();
  const anioId = useId();
  const anioActual = new Date().getFullYear();
  const anios = [anioActual + 1, anioActual, anioActual - 1, anioActual - 2];

  return (
    <>
      <div>
        <label htmlFor={mesId}>Mes</label>
        <select id={mesId} value={mes} onChange={(e) => alCambiar({ anio, mes: Number(e.target.value) })}>
          {MESES.map((nombre, indice) => (
            <option key={nombre} value={indice + 1}>
              {nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={anioId}>Año</label>
        <select id={anioId} value={anio} onChange={(e) => alCambiar({ anio: Number(e.target.value), mes })}>
          {anios.map((valor) => (
            <option key={valor} value={valor}>
              {valor}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

/** Selector de moneda. Se repite en todas las pantallas de dinero. */
export function SelectorMoneda({ moneda, alCambiar }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>Moneda</label>
      <select id={id} value={moneda} onChange={(e) => alCambiar(e.target.value)}>
        <option value="COP">COP</option>
        <option value="USD">USD</option>
      </select>
    </div>
  );
}

/**
 * "Ver también en la otra moneda". La conversión es solo para mirar: lo
 * guardado nunca cambia de moneda, y se avisa de qué tasa se usó.
 */
export function SelectorEquivalencia({ moneda, convertirA, alCambiar }) {
  const otra = moneda === "COP" ? "USD" : "COP";
  const id = useId();

  return (
    <div>
      <label htmlFor={id}>Ver también en</label>
      <select id={id} value={convertirA ?? ""} onChange={(e) => alCambiar(e.target.value || null)}>
        <option value="">Solo {moneda}</option>
        <option value={otra}>{otra}</option>
      </select>
    </div>
  );
}

/** Explica de dónde salió una conversión. Nunca se muestra una cifra convertida sin esto. */
export function NotaTasa({ tasa, moneda }) {
  if (!tasa) return null;

  const fuente =
    tasa.fuente === "trm-oficial" ? "TRM oficial" : "tasa de mercado (la TRM no respondió)";

  return (
    <p className="tenue" style={{ marginTop: 8 }}>
      Equivalencia calculada con la {fuente} del {tasa.fecha}: 1 USD = {" "}
      {new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(tasa.pesosPorDolar)} COP.
      {!tasa.exacta && " Ese día no tuvo tasa propia (festivo o fin de semana); se usó la anterior."}
      {" "}Es solo una referencia: lo registrado sigue en {moneda}.
    </p>
  );
}
