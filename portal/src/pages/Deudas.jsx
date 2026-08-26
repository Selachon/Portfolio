// Lo que debes y lo que te deben.
//
// Una deuda se puede llevar de dos maneras, y las dos conviven en la misma
// tabla: por cuotas pactadas, o de abono libre, donde se apunta lo que se
// pagó cuando se pagó y el saldo baja por esa cantidad.

import { useState } from "react";
import { Check, Coins, History, Plus, Undo2 } from "lucide-react";
import { api, dinero, fechaLegible } from "../api.js";
import {
  Aviso,
  Barra,
  Campo,
  Cargando,
  Kpi,
  MetaLinea,
  Modal,
  Panel,
  TablaVacia,
} from "../components/comunes.jsx";
import { useDatos } from "../hooks.js";

export default function Deudas() {
  const [creando, setCreando] = useState(null);
  const [abonando, setAbonando] = useState(null);
  const [viendo, setViendo] = useState(null);
  const [error, setError] = useState(null);

  const { datos, error: errorCarga, recargar } = useDatos(async () => {
    const [deudas, deudores] = await Promise.all([api.get("/api/deudas"), api.get("/api/deudores")]);
    return { deudas, deudores };
  }, []);

  const accion = async (ejecutar) => {
    setError(null);
    try {
      await ejecutar();
      recargar();
    } catch (fallo) {
      setError(fallo.message);
    }
  };

  const pagarCuota = (deuda) => accion(() => api.post(`/api/deudas/${deuda.id}/cuota`));
  const cobrar = (deudor) => accion(() => api.patch(`/api/deudores/${deudor.id}`, { estado: "cobrado" }));

  if (!datos) return errorCarga ? <Aviso tipo="error">{errorCarga}</Aviso> : <Cargando />;

  const { deudas, deudores } = datos;
  const { resumen } = deudas;

  return (
    <>
      <MetaLinea
        partes={[
          "Deudas",
          `${resumen.activas} activas`,
          resumen.cuotasPendientes > 0 ? `${resumen.cuotasPendientes} cuotas pendientes` : "sin cuotas fijas",
        ]}
      />

      <div className="cabecera-pagina">
        <div>
          <h1>
            Deudas y <em>deudores</em>
          </h1>
          <p>Lo que debes —por cuotas o abonando libre— y lo que te deben.</p>
        </div>
      </div>

      {(error || errorCarga) && <Aviso tipo="error">{error ?? errorCarga}</Aviso>}

      <div className="rejilla aparece" style={{ marginBottom: 22 }}>
        <Kpi
          etiqueta="Saldo pendiente de tus deudas"
          centavos={-resumen.restanteCentavos}
          pie={
            resumen.capitalCentavos > 0
              ? `Llevas abonado ${dinero(resumen.abonadoCentavos)} de ${dinero(resumen.capitalCentavos)}`
              : undefined
          }
        />
        <Kpi
          etiqueta="Ya abonado"
          centavos={resumen.abonadoCentavos}
          pie={
            resumen.capitalCentavos > 0
              ? `${Math.round((resumen.abonadoCentavos / resumen.capitalCentavos) * 100)}% del capital`
              : undefined
          }
        />
        <Kpi etiqueta="Por cobrar" centavos={deudores.resumen.pendienteCentavos} />
      </div>

      <div className="entre" style={{ marginBottom: 10 }}>
        <h2>Lo que debes</h2>
        <button onClick={() => setCreando("deuda")}>
          <Plus size={14} /> Nueva deuda
        </button>
      </div>

      <div className="tabla-envoltura aparece" style={{ marginBottom: 30 }}>
        <table>
          <thead>
            <tr>
              <th>Concepto</th>
              <th className="num">Capital</th>
              <th className="num">Día</th>
              <th>Avance</th>
              <th className="num">Restante</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {deudas.deudas.length === 0 ? (
              <TablaVacia columnas={6} texto="No tienes deudas registradas." />
            ) : (
              deudas.deudas.map((deuda) => (
                <tr key={deuda.id} style={{ opacity: deuda.activa && !deuda.saldada ? 1 : 0.55 }}>
                  <td>
                    {deuda.concepto}
                    <div className="tenue">
                      <span className="etiqueta" style={{ marginRight: 6 }}>
                        {deuda.tipo === "cuotas" ? "por cuotas" : "abono libre"}
                      </span>
                      {deuda.saldada && <span className="etiqueta etiqueta--ok">saldada</span>}
                    </div>
                    {deuda.notas && <div className="tenue">{deuda.notas}</div>}
                  </td>
                  <td className="num">{dinero(deuda.centavos, deuda.moneda)}</td>
                  <td className="num">{deuda.dia ?? "—"}</td>
                  <td style={{ minWidth: 150 }}>
                    <div className="tenue">
                      {deuda.tipo === "cuotas"
                        ? `${deuda.pagadas} / ${deuda.cuotas} cuotas`
                        : `${dinero(deuda.abonadoCentavos, deuda.moneda)} abonado`}
                      {" · "}
                      {deuda.porcentaje}%
                    </div>
                    <Barra porcentaje={deuda.porcentaje} />
                  </td>
                  <td className={`num ${deuda.saldada ? "positivo" : "negativo"}`}>
                    {dinero(deuda.restanteCentavos, deuda.moneda)}
                    {deuda.cuotaSugeridaCentavos > 0 && (
                      <div className="tenue">cuota ≈ {dinero(deuda.cuotaSugeridaCentavos, deuda.moneda)}</div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 2 }}>
                      {!deuda.saldada && (
                        <button
                          className="icono"
                          title="Registrar un abono por el importe que sea"
                          onClick={() => setAbonando(deuda)}
                        >
                          <Coins size={14} />
                        </button>
                      )}
                      {!deuda.saldada && deuda.tipo === "cuotas" && deuda.pendientes > 0 && (
                        <button
                          className="icono"
                          title={`Pagué la cuota (${dinero(deuda.cuotaSugeridaCentavos, deuda.moneda)})`}
                          onClick={() => pagarCuota(deuda)}
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        className="icono"
                        title="Ver el historial de abonos"
                        onClick={() => setViendo(deuda)}
                      >
                        <History size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="entre" style={{ marginBottom: 10 }}>
        <h2>Lo que te deben</h2>
        <button onClick={() => setCreando("deudor")}>
          <Plus size={14} /> Nuevo deudor
        </button>
      </div>

      <div className="tabla-envoltura aparece">
        <table>
          <thead>
            <tr>
              <th>Deudor</th>
              <th className="num">Valor</th>
              <th className="num">Día</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {deudores.deudores.length === 0 ? (
              <TablaVacia columnas={5} texto="Nadie te debe nada registrado." />
            ) : (
              deudores.deudores.map((deudor) => (
                <tr key={deudor.id}>
                  <td>
                    {deudor.deudor}
                    {deudor.notas && <div className="tenue">{deudor.notas}</div>}
                  </td>
                  <td className="num">{dinero(deudor.centavos, deudor.moneda)}</td>
                  <td className="num">{deudor.dia ?? "—"}</td>
                  <td>
                    <span className={`etiqueta ${deudor.estado === "cobrado" ? "etiqueta--ok" : ""}`}>
                      {deudor.estado}
                    </span>
                  </td>
                  <td>
                    {deudor.estado === "pendiente" && (
                      <button className="icono" title="Marcar como cobrado" onClick={() => cobrar(deudor)}>
                        <Check size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {creando && (
        <FormularioDeuda
          tipo={creando}
          alCerrar={() => setCreando(null)}
          alGuardar={() => {
            setCreando(null);
            recargar();
          }}
        />
      )}

      {abonando && (
        <FormularioAbono
          deuda={abonando}
          alCerrar={() => setAbonando(null)}
          alGuardar={() => {
            setAbonando(null);
            recargar();
          }}
        />
      )}

      {viendo && (
        <HistorialAbonos
          deuda={viendo}
          alCerrar={() => setViendo(null)}
          alCambiar={recargar}
        />
      )}
    </>
  );
}

/** Registrar un abono: el camino normal en las deudas sin cuota fija. */
function FormularioAbono({ deuda, alCerrar, alGuardar }) {
  const esCuotas = deuda.tipo === "cuotas";
  const [valores, setValores] = useState({
    // En las de cuotas se propone la cuota; en las libres se deja en blanco a
    // propósito, porque ahí el importe es distinto cada vez.
    importe: esCuotas && deuda.cuotaSugeridaCentavos ? String(deuda.cuotaSugeridaCentavos / 100) : "",
    fecha: new Date().toISOString().slice(0, 10),
    notas: "",
    cuentaCuota: esCuotas && deuda.pendientes > 0,
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
      await api.post(`/api/deudas/${deuda.id}/abonos`, {
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

  const restante = deuda.restanteCentavos;

  return (
    <Modal titulo={`Abonar a "${deuda.concepto}"`} alCerrar={alCerrar}>
      <form onSubmit={enviar}>
        {error && <Aviso tipo="error">{error}</Aviso>}

        <p className="tenue" style={{ marginTop: 0 }}>
          Saldo pendiente: <strong>{dinero(restante, deuda.moneda)}</strong>
          {esCuotas && deuda.pendientes > 0 && ` · quedan ${deuda.pendientes} cuota(s)`}
        </p>

        <div className="campos">
          <Campo etiqueta="¿Cuánto abonaste?">
            <input value={valores.importe} onChange={cambiar("importe")} required autoFocus />
          </Campo>
          <Campo etiqueta="¿Cuándo?">
            <input type="date" value={valores.fecha} onChange={cambiar("fecha")} required />
          </Campo>
        </div>

        <div className="acciones" style={{ marginBottom: 14 }}>
          <button type="button" onClick={() => setValores((p) => ({ ...p, importe: String(restante / 100) }))}>
            Saldar del todo
          </button>
          {esCuotas && deuda.cuotaSugeridaCentavos > 0 && (
            <button
              type="button"
              onClick={() =>
                setValores((p) => ({ ...p, importe: String(deuda.cuotaSugeridaCentavos / 100) }))
              }
            >
              Una cuota
            </button>
          )}
        </div>

        {esCuotas && (
          <label style={{ display: "flex", gap: 9, alignItems: "center", textTransform: "none", fontSize: 13 }}>
            <input
              type="checkbox"
              style={{ width: "auto" }}
              checked={valores.cuentaCuota}
              disabled={deuda.pendientes === 0}
              onChange={(e) => setValores((p) => ({ ...p, cuentaCuota: e.target.checked }))}
            />
            Contar este abono como una de las cuotas pactadas
          </label>
        )}

        <Campo etiqueta="Notas">
          <input value={valores.notas} onChange={cambiar("notas")} placeholder="De dónde salió el dinero, por ejemplo" />
        </Campo>

        <div className="acciones">
          <button className="principal" type="submit" disabled={enviando}>
            {enviando ? "Registrando…" : "Registrar abono"}
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

/** Historial de una deuda: de dónde sale el saldo, abono por abono. */
function HistorialAbonos({ deuda, alCerrar, alCambiar }) {
  const [error, setError] = useState(null);

  const { datos, error: errorCarga, recargar } = useDatos(
    () => api.get(`/api/deudas/${deuda.id}`),
    [deuda.id],
  );

  const deshacer = async (abono) => {
    setError(null);
    try {
      await api.delete(`/api/deudas/${deuda.id}/abonos/${abono.id}`);
      recargar();
      alCambiar();
    } catch (fallo) {
      setError(fallo.message);
    }
  };

  const actual = datos?.deuda;

  return (
    <Modal titulo={`Historial de "${deuda.concepto}"`} ancho alCerrar={alCerrar}>
      {(error || errorCarga) && <Aviso tipo="error">{error ?? errorCarga}</Aviso>}

      {!actual ? (
        <Cargando />
      ) : (
        <>
          <div className="rejilla" style={{ marginBottom: 18 }}>
            <Kpi etiqueta="Capital" centavos={actual.centavos} moneda={actual.moneda} tono="" />
            <Kpi etiqueta="Abonado" centavos={actual.abonadoCentavos} moneda={actual.moneda} />
            <Kpi etiqueta="Restante" centavos={-actual.restanteCentavos} moneda={actual.moneda} />
          </div>

          <Panel esquinas plano style={{ marginBottom: 16 }}>
            <div className="tenue" style={{ marginBottom: 6 }}>
              {actual.porcentaje}% del capital cubierto
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
                  <TablaVacia
                    columnas={4}
                    texto="Todavía no hay abonos registrados en el portal."
                  />
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
                        <button
                          className="icono"
                          title="Deshacer este abono"
                          onClick={() => deshacer(abono)}
                        >
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
              Esta deuda ya venía con {dinero(actual.abonadoCentavos, actual.moneda)} abonados de
              antes de usar el portal, así que ese pago no aparece en la lista.
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

function FormularioDeuda({ tipo, alCerrar, alGuardar }) {
  const esDeuda = tipo === "deuda";
  const [valores, setValores] = useState({
    concepto: "",
    deudor: "",
    importe: "",
    dia: "",
    tipoDeuda: "cuotas",
    cuotas: "1",
    pagadas: "0",
    abonado: "",
    notas: "",
  });
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo) => (evento) =>
    setValores((previos) => ({ ...previos, [campo]: evento.target.value }));

  const porCuotas = valores.tipoDeuda === "cuotas";

  const enviar = async (evento) => {
    evento.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      if (esDeuda) {
        await api.post("/api/deudas", {
          concepto: valores.concepto,
          importe: valores.importe,
          dia: valores.dia || null,
          tipo: valores.tipoDeuda,
          cuotas: porCuotas ? Number(valores.cuotas) : undefined,
          pagadas: porCuotas ? Number(valores.pagadas) : undefined,
          abonado: valores.abonado || undefined,
          notas: valores.notas,
        });
      } else {
        await api.post("/api/deudores", {
          deudor: valores.deudor,
          importe: valores.importe,
          dia: valores.dia || null,
          notas: valores.notas,
        });
      }
      alGuardar();
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal titulo={esDeuda ? "Nueva deuda" : "Nuevo deudor"} alCerrar={alCerrar}>
      <form onSubmit={enviar}>
        {error && <Aviso tipo="error">{error}</Aviso>}

        <Campo etiqueta={esDeuda ? "Concepto" : "¿Quién te debe?"}>
          <input
            value={esDeuda ? valores.concepto : valores.deudor}
            onChange={cambiar(esDeuda ? "concepto" : "deudor")}
            required
            autoFocus
          />
        </Campo>

        <div className="campos">
          <Campo etiqueta={esDeuda ? "Capital total" : "Valor"}>
            <input value={valores.importe} onChange={cambiar("importe")} required />
          </Campo>
          <Campo etiqueta="Día del mes">
            <input value={valores.dia} onChange={cambiar("dia")} />
          </Campo>
        </div>

        {esDeuda && (
          <>
            <Campo etiqueta="¿Cómo se paga?">
              <select value={valores.tipoDeuda} onChange={cambiar("tipoDeuda")}>
                <option value="cuotas">Por cuotas pactadas</option>
                <option value="libre">Abonando libre, sin cuota fija</option>
              </select>
            </Campo>

            {porCuotas ? (
              <div className="campos">
                <Campo etiqueta="Cuotas totales">
                  <input type="number" min="1" value={valores.cuotas} onChange={cambiar("cuotas")} required />
                </Campo>
                <Campo etiqueta="Cuotas ya pagadas">
                  <input type="number" min="0" value={valores.pagadas} onChange={cambiar("pagadas")} />
                </Campo>
              </div>
            ) : (
              <Campo etiqueta="¿Ya habías abonado algo? (opcional)">
                <input
                  value={valores.abonado}
                  onChange={cambiar("abonado")}
                  placeholder="Déjalo vacío si no has pagado nada todavía"
                />
              </Campo>
            )}
          </>
        )}

        <Campo etiqueta="Notas">
          <input value={valores.notas} onChange={cambiar("notas")} />
        </Campo>

        <div className="acciones">
          <button className="principal" type="submit" disabled={enviando}>
            {enviando ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" onClick={alCerrar}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
