// Piezas compartidas por las deudas y por los cobros.
//
// Las dos pantallas hacen lo mismo con distinto nombre: registrar un abono y
// mirar el historial. Están aquí para que no se dupliquen y para que arreglar
// algo en una lo arregle en las dos.

import { useState } from "react";
import { Undo2 } from "lucide-react";
import { api, dinero, fechaLegible } from "../api.js";
import { Aviso, Barra, Campo, Cargando, Kpi, Modal, Panel, TablaVacia } from "./comunes.jsx";
import { useDatos } from "../hooks.js";

/**
 * Registrar un abono. Es el camino normal cuando no hay cuota fija, y también
 * sirve en los saldos por cuotas cuando se paga distinto de lo pactado.
 *
 * `textos` adapta el vocabulario: no es lo mismo abonar a una deuda propia que
 * anotar lo que alguien te devolvió.
 */
export function FormularioAbono({ saldo, ruta, textos, alCerrar, alGuardar }) {
  const esCuotas = saldo.tipo === "cuotas";
  const [valores, setValores] = useState({
    // En las de cuotas se propone la cuota; en las libres se deja en blanco a
    // propósito, porque ahí el importe es distinto cada vez.
    importe: esCuotas && saldo.cuotaSugeridaCentavos ? String(saldo.cuotaSugeridaCentavos / 100) : "",
    fecha: new Date().toISOString().slice(0, 10),
    notas: "",
    cuentaCuota: esCuotas && saldo.pendientes > 0,
  });
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo) => (evento) =>
    setValores((previos) => ({ ...previos, [campo]: evento.target.value }));

  const enviar = async (evento) => {
    evento.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      await api.post(`${ruta}/${saldo.id}/abonos`, {
        importe: valores.importe,
        fecha: valores.fecha,
        notas: valores.notas || null,
        cuentaCuota: valores.cuentaCuota,
      });
      alGuardar();
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setEnviando(false);
    }
  };

  const restante = saldo.restanteCentavos;

  return (
    <Modal titulo={`${textos.titulo} "${saldo.nombre}"`} alCerrar={alCerrar}>
      <form onSubmit={enviar}>
        {error && <Aviso tipo="error">{error}</Aviso>}

        <p className="tenue" style={{ marginTop: 0 }}>
          {textos.saldo}: <strong>{dinero(restante, saldo.moneda)}</strong>
          {esCuotas && saldo.pendientes > 0 && ` · quedan ${saldo.pendientes} cuota(s)`}
        </p>

        <div className="campos">
          <Campo etiqueta={textos.cuanto}>
            <input value={valores.importe} onChange={cambiar("importe")} required autoFocus />
          </Campo>
          <Campo etiqueta="¿Cuándo?">
            <input type="date" value={valores.fecha} onChange={cambiar("fecha")} required />
          </Campo>
        </div>

        <div className="acciones" style={{ marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => setValores((p) => ({ ...p, importe: String(restante / 100) }))}
          >
            {textos.todo}
          </button>
          {esCuotas && saldo.cuotaSugeridaCentavos > 0 && (
            <button
              type="button"
              onClick={() =>
                setValores((p) => ({ ...p, importe: String(saldo.cuotaSugeridaCentavos / 100) }))
              }
            >
              Una cuota
            </button>
          )}
        </div>

        {esCuotas && (
          <label
            style={{ display: "flex", gap: 9, alignItems: "center", textTransform: "none", fontSize: 13 }}
          >
            <input
              type="checkbox"
              style={{ width: "auto" }}
              checked={valores.cuentaCuota}
              disabled={saldo.pendientes === 0}
              onChange={(e) => setValores((p) => ({ ...p, cuentaCuota: e.target.checked }))}
            />
            Contar esto como una de las cuotas pactadas
          </label>
        )}

        <Campo etiqueta="Notas">
          <input value={valores.notas} onChange={cambiar("notas")} placeholder={textos.notas} />
        </Campo>

        <div className="acciones">
          <button className="principal" type="submit" disabled={enviando}>
            {enviando ? "Registrando…" : textos.boton}
            <span className="flecha">→</span>
          </button>
          <button type="button" onClick={alCerrar}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Historial de un saldo: de dónde sale la cifra, abono por abono. */
export function HistorialAbonos({ saldo, ruta, clave, textos, alCerrar, alCambiar }) {
  const [error, setError] = useState(null);

  const { datos, error: errorCarga, recargar } = useDatos(
    () => api.get(`${ruta}/${saldo.id}`),
    [saldo.id],
  );

  const deshacer = async (abono) => {
    setError(null);
    try {
      await api.delete(`${ruta}/${saldo.id}/abonos/${abono.id}`);
      recargar();
      alCambiar();
    } catch (fallo) {
      setError(fallo.message);
    }
  };

  const actual = datos?.[clave];

  return (
    <Modal titulo={`Historial de "${saldo.nombre}"`} ancho alCerrar={alCerrar}>
      {(error || errorCarga) && <Aviso tipo="error">{error ?? errorCarga}</Aviso>}

      {!actual ? (
        <Cargando />
      ) : (
        <>
          <div className="rejilla" style={{ marginBottom: 18 }}>
            <Kpi etiqueta={textos.capital} centavos={actual.centavos} moneda={actual.moneda} tono="" />
            <Kpi etiqueta={textos.abonado} centavos={actual.abonadoCentavos} moneda={actual.moneda} />
            <Kpi etiqueta="Restante" centavos={-actual.restanteCentavos} moneda={actual.moneda} />
          </div>

          <Panel esquinas plano style={{ marginBottom: 16 }}>
            <div className="tenue" style={{ marginBottom: 6 }}>
              {actual.porcentaje}% cubierto
              {actual.tipo === "cuotas" && ` · ${actual.pagadas} de ${actual.cuotas} cuotas`}
            </div>
            <Barra porcentaje={actual.porcentaje} />
          </Panel>

          <div className="tabla-envoltura">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th className="num">Importe</th>
                  <th>Notas</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(actual.abonos ?? []).length === 0 ? (
                  <TablaVacia columnas={4} texto="Todavía no hay abonos registrados en el portal." />
                ) : (
                  actual.abonos.map((abono) => (
                    <tr key={abono.id}>
                      <td className="cifra">{fechaLegible(abono.fecha)}</td>
                      <td className="num positivo">{dinero(abono.centavos, actual.moneda)}</td>
                      <td>
                        {abono.cuentaCuota && (
                          <span className="etiqueta" style={{ marginRight: 6 }}>
                            cuota
                          </span>
                        )}
                        <span className="tenue">{abono.notas ?? ""}</span>
                      </td>
                      <td>
                        <button className="icono" title="Deshacer este abono" onClick={() => deshacer(abono)}>
                          <Undo2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {actual.abonadoCentavos > 0 && (actual.abonos ?? []).length === 0 && (
            <p className="tenue" style={{ marginTop: 12 }}>
              {textos.previo(dinero(actual.abonadoCentavos, actual.moneda))}
            </p>
          )}

          {(actual.abonos ?? []).length > 0 && (
            <p className="tenue" style={{ marginTop: 12 }}>
              Deshacer un abono devuelve el saldo y queda registrado en la auditoría.
            </p>
          )}
        </>
      )}
    </Modal>
  );
}

/** Columna de avance: cuánto se lleva cubierto y cuánto falta. */
export function Avance({ saldo, textoLibre }) {
  return (
    <>
      <div className="tenue">
        {saldo.tipo === "cuotas"
          ? `${saldo.pagadas} / ${saldo.cuotas} cuotas`
          : textoLibre}
        {" · "}
        {saldo.porcentaje}%
      </div>
      <Barra porcentaje={saldo.porcentaje} />
    </>
  );
}
