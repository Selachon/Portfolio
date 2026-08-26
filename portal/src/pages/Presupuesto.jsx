// Presupuesto fijo: los conceptos recurrentes y su estado en cada mes.

import { useState } from "react";
import { Archive, ArchiveRestore, Check, Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import { api, dinero, nombreMes } from "../api.js";
import {
  Aviso,
  Campo,
  Cargando,
  Kpi,
  MetaLinea,
  ConfirmarBorrado,
  Modal,
  SelectorPeriodo,
  TablaVacia,
} from "../components/comunes.jsx";
import { useSesion } from "../sesion.js";
import { useDatos } from "../hooks.js";

export default function Presupuesto() {
  const hoy = new Date();
  const [periodo, setPeriodo] = useState({ anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 });
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [marcando, setMarcando] = useState(null);
  const [borrando, setBorrando] = useState(null);
  const [verRetirados, setVerRetirados] = useState(false);
  const [errorAccion, setErrorAccion] = useState(null);
  const { esPropietario } = useSesion();

  const { datos, error, recargar } = useDatos(
    () =>
      api.get(
        `/api/presupuesto?anio=${periodo.anio}&mes=${periodo.mes}` +
          (verRetirados ? "&retirados=1" : ""),
      ),
    [periodo.anio, periodo.mes, verRetirados],
  );

  const accion = async (ejecutar) => {
    setErrorAccion(null);
    try {
      await ejecutar();
      recargar();
    } catch (fallo) {
      setErrorAccion(fallo.message);
    }
  };

  const cambiarEstado = (concepto, estado) =>
    accion(() =>
      api.put(`/api/presupuesto/${concepto.id}/${periodo.anio}/${periodo.mes}`, { estado }),
    );

  // Retirar no borra: el concepto sale del plan del mes pero se puede recuperar.
  const cambiarActivo = (concepto, activo) =>
    accion(() => api.patch(`/api/presupuesto/${concepto.id}`, { activo }));

  return (
    <>
      <MetaLinea
        partes={[
          "Presupuesto",
          `${nombreMes(periodo.mes)} ${periodo.anio}`,
          datos?.resumen ? `${datos.resumen.pendientes} pendientes` : "cargando",
        ]}
      />

      <div className="cabecera-pagina">
        <div>
          <h1>
            Presupuesto <em>fijo</em>
          </h1>
          <p>Lo que se repite cada mes, con su estado de pago.</p>
        </div>
        <div className="acciones">
          <div className="filtros" style={{ margin: 0 }}>
            <SelectorPeriodo {...periodo} alCambiar={setPeriodo} />
          </div>
          <button className="principal" onClick={() => setCreando(true)}>
            <Plus size={14} /> Nuevo concepto
          </button>
        </div>
      </div>

      {(error || errorAccion) && <Aviso tipo="error">{error ?? errorAccion}</Aviso>}

      {datos?.resumen && (
        <div className="rejilla aparece" style={{ marginBottom: 18 }}>
          <Kpi etiqueta="Gastos planeados" centavos={-datos.resumen.gastosPlaneados} />
          <Kpi etiqueta="Ingresos planeados" centavos={datos.resumen.ingresosPlaneados} />
          <Kpi
            etiqueta="Pendiente de pagar"
            centavos={datos.resumen.pendientesCentavos}
            pie={`${datos.resumen.pendientes} concepto(s) sin marcar`}
            tono=""
          />
        </div>
      )}

      {!datos ? (
        <Cargando />
      ) : (
        <div className="tabla-envoltura aparece">
          <table>
            <thead>
              <tr>
                <th>Concepto</th>
                <th className="num">Día</th>
                <th className="num">Valor</th>
                <th>Frecuencia</th>
                <th>Tipo</th>
                <th>Pago</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {datos.conceptos.length === 0 ? (
                <TablaVacia columnas={8} texto="Todavía no hay conceptos en el presupuesto." />
              ) : (
                datos.conceptos.map((concepto) => {
                  const pagado = concepto.estadoDelMes === "pagado";
                  const importe = concepto.centavosDelMes ?? concepto.centavos;

                  return (
                    <tr key={concepto.id}>
                      <td>
                        {concepto.concepto}
                        {concepto.notas && <div className="tenue">{concepto.notas}</div>}
                      </td>
                      <td className="num">{concepto.dia ?? "—"}</td>
                      <td className={`num ${concepto.tipo === "gasto" ? "negativo" : "positivo"}`}>
                        {dinero(importe, concepto.moneda)}
                        {concepto.centavosDelMes !== undefined &&
                          concepto.centavosDelMes !== concepto.centavos && (
                            <div className="tenue">plan: {dinero(concepto.centavos, concepto.moneda)}</div>
                          )}
                      </td>
                      <td className="tenue">{concepto.frecuencia}</td>
                      <td className="tenue">{concepto.tipo}</td>
                      <td className="tenue">{concepto.pago}</td>
                      <td>
                        <span className={`etiqueta ${pagado ? "etiqueta--ok" : "etiqueta--atencion"}`}>
                          {concepto.estadoDelMes}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 2 }}>
                          {pagado ? (
                            <button
                              className="icono"
                              title="Marcar como pendiente"
                              onClick={() => cambiarEstado(concepto, "pendiente")}
                            >
                              <Undo2 size={14} />
                            </button>
                          ) : (
                            <button
                              className="icono"
                              title="Marcar como pagado"
                              onClick={() => setMarcando(concepto)}
                            >
                              <Check size={14} />
                            </button>
                          )}
                          <button
                            className="icono"
                            title="Editar este concepto"
                            onClick={() => setEditando(concepto)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="icono"
                            title="Retirar del presupuesto (se puede recuperar)"
                            onClick={() => cambiarActivo(concepto, false)}
                          >
                            <Archive size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="entre" style={{ marginTop: 22 }}>
        <p className="tenue" style={{ margin: 0 }}>
          Retirar un concepto lo saca del plan sin borrar su historial de pagos.
        </p>
        <button className="discreto" onClick={() => setVerRetirados((valor) => !valor)}>
          {verRetirados ? "Ocultar retirados" : "Ver conceptos retirados"}
        </button>
      </div>

      {verRetirados && datos && (
        <div className="tabla-envoltura aparece" style={{ marginTop: 10 }}>
          <table>
            <thead>
              <tr>
                <th>Concepto retirado</th>
                <th className="num">Valor</th>
                <th>Frecuencia</th>
                <th>Tipo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(datos.retirados ?? []).length === 0 ? (
                <TablaVacia columnas={5} texto="No has retirado ningún concepto." />
              ) : (
                datos.retirados.map((concepto) => (
                  <tr key={concepto.id} style={{ opacity: 0.6 }}>
                    <td>
                      {concepto.concepto}
                      {concepto.notas && <div className="tenue">{concepto.notas}</div>}
                    </td>
                    <td className="num">{dinero(concepto.centavos, concepto.moneda)}</td>
                    <td className="tenue">{concepto.frecuencia}</td>
                    <td className="tenue">{concepto.tipo}</td>
                    <td>
                      <div style={{ display: "flex", gap: 2 }}>
                        <button
                          className="icono"
                          title="Devolverlo al presupuesto"
                          onClick={() => cambiarActivo(concepto, true)}
                        >
                          <ArchiveRestore size={14} />
                        </button>
                        <button
                          className="icono"
                          title="Editar este concepto"
                          onClick={() => setEditando(concepto)}
                        >
                          <Pencil size={14} />
                        </button>
                        {esPropietario && (
                          <button
                            className="icono peligro"
                            title="Borrarlo para siempre, con su historial"
                            onClick={() => setBorrando(concepto)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {borrando && (
        <ConfirmarBorrado
          que={`${borrando.concepto} y todo su historial de pagos`}
          alConfirmar={() =>
            accion(async () => {
              await api.delete(`/api/presupuesto/${borrando.id}`);
              setBorrando(null);
            })
          }
          alCerrar={() => setBorrando(null)}
        />
      )}

      {(creando || editando) && (
        <FormularioConcepto
          concepto={editando}
          alCerrar={() => {
            setCreando(false);
            setEditando(null);
          }}
          alGuardar={() => {
            setCreando(false);
            setEditando(null);
            recargar();
          }}
        />
      )}

      {marcando && (
        <MarcarPagado
          concepto={marcando}
          periodo={periodo}
          alCerrar={() => setMarcando(null)}
          alGuardar={() => {
            setMarcando(null);
            recargar();
          }}
        />
      )}
    </>
  );
}

function MarcarPagado({ concepto, periodo, alCerrar, alGuardar }) {
  const [importe, setImporte] = useState(String(concepto.centavos / 100));
  const [pagadoEl, setPagadoEl] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState(null);

  const guardar = async (evento) => {
    evento.preventDefault();
    try {
      await api.put(`/api/presupuesto/${concepto.id}/${periodo.anio}/${periodo.mes}`, {
        estado: "pagado",
        importe,
        pagadoEl,
      });
      alGuardar();
    } catch (fallo) {
      setError(fallo.message);
    }
  };

  return (
    <Modal titulo={`Marcar "${concepto.concepto}" como pagado`} alCerrar={alCerrar}>
      <form onSubmit={guardar}>
        {error && <Aviso tipo="error">{error}</Aviso>}
        <p className="tenue" style={{ marginTop: 0 }}>
          Si este mes costó distinto de lo planeado, corrige el valor: el plan no se toca.
        </p>
        <div className="campos">
          <Campo etiqueta="Valor real del mes">
            <input value={importe} onChange={(e) => setImporte(e.target.value)} required />
          </Campo>
          <Campo etiqueta="Fecha de pago">
            <input type="date" value={pagadoEl} onChange={(e) => setPagadoEl(e.target.value)} />
          </Campo>
        </div>
        <div className="acciones">
          <button className="principal" type="submit">
            Guardar
          </button>
          <button type="button" onClick={alCerrar}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Sirve para crear y para editar: los campos son los mismos. */
function FormularioConcepto({ concepto, alCerrar, alGuardar }) {
  const editando = Boolean(concepto);
  const [valores, setValores] = useState({
    concepto: concepto?.concepto ?? "",
    dia: concepto?.dia ? String(concepto.dia) : "",
    // Al editar se muestra el importe del PLAN, no el que se pagó este mes:
    // son cosas distintas y confundirlas reescribiría el presupuesto.
    importe: concepto ? String(concepto.centavos / 100) : "",
    moneda: concepto?.moneda ?? "COP",
    frecuencia: concepto?.frecuencia ?? "mensual",
    tipo: concepto?.tipo ?? "gasto",
    pago: concepto?.pago ?? "manual",
    notas: concepto?.notas ?? "",
  });
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo) => (evento) =>
    setValores((previos) => ({ ...previos, [campo]: evento.target.value }));

  const enviar = async (evento) => {
    evento.preventDefault();
    setError(null);
    setEnviando(true);

    // El día se manda como null cuando se vacía, para poder quitárselo a un
    // concepto que deja de tener fecha fija.
    const cuerpo = { ...valores, dia: valores.dia === "" ? null : valores.dia };

    try {
      if (editando) {
        await api.patch(`/api/presupuesto/${concepto.id}`, cuerpo);
      } else {
        await api.post("/api/presupuesto", cuerpo);
      }
      alGuardar();
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      titulo={editando ? `Editar "${concepto.concepto}"` : "Nuevo concepto del presupuesto"}
      alCerrar={alCerrar}
    >
      <form onSubmit={enviar}>
        {error && <Aviso tipo="error">{error}</Aviso>}

        <Campo etiqueta="Concepto">
          <input value={valores.concepto} onChange={cambiar("concepto")} required autoFocus />
        </Campo>

        <div className="campos">
          <Campo etiqueta="Valor (siempre positivo)">
            <input value={valores.importe} onChange={cambiar("importe")} placeholder="2500000" required />
          </Campo>
          <Campo etiqueta="Día del mes">
            <input value={valores.dia} onChange={cambiar("dia")} placeholder="13" />
          </Campo>
          <Campo etiqueta="Moneda">
            <select value={valores.moneda} onChange={cambiar("moneda")}>
              <option value="COP">COP</option>
              <option value="USD">USD</option>
            </select>
          </Campo>
        </div>

        <div className="campos">
          <Campo etiqueta="Tipo">
            <select value={valores.tipo} onChange={cambiar("tipo")}>
              <option value="gasto">Gasto</option>
              <option value="ingreso">Ingreso</option>
            </select>
          </Campo>
          <Campo etiqueta="Frecuencia">
            <select value={valores.frecuencia} onChange={cambiar("frecuencia")}>
              <option value="mensual">Mensual</option>
              <option value="bimestral">Bimestral</option>
              <option value="trimestral">Trimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
            </select>
          </Campo>
          <Campo etiqueta="Pago">
            <select value={valores.pago} onChange={cambiar("pago")}>
              <option value="manual">Manual</option>
              <option value="automatico">Automático</option>
            </select>
          </Campo>
        </div>

        <Campo etiqueta="Notas">
          <input value={valores.notas} onChange={cambiar("notas")} placeholder="Variable, según consumo" />
        </Campo>

        <div className="acciones">
          <button className="principal" type="submit" disabled={enviando}>
            {enviando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar"}
          </button>
          <button type="button" onClick={alCerrar}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
