// Presupuesto fijo: los conceptos recurrentes y su estado en cada mes.

import { useState } from "react";
import { Check, Plus, Undo2 } from "lucide-react";
import { api, dinero, nombreMes } from "../api.js";
import {
  Aviso,
  Campo,
  Cargando,
  Kpi,
  MetaLinea,
  Modal,
  SelectorPeriodo,
  TablaVacia,
} from "../components/comunes.jsx";
import { useDatos } from "../hooks.js";

export default function Presupuesto() {
  const hoy = new Date();
  const [periodo, setPeriodo] = useState({ anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 });
  const [creando, setCreando] = useState(false);
  const [marcando, setMarcando] = useState(null);

  const { datos, error, recargar } = useDatos(
    () => api.get(`/api/presupuesto?anio=${periodo.anio}&mes=${periodo.mes}`),
    [periodo.anio, periodo.mes],
  );

  const cambiarEstado = async (concepto, estado) => {
    await api.put(`/api/presupuesto/${concepto.id}/${periodo.anio}/${periodo.mes}`, { estado });
    recargar();
  };

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

      {error && <Aviso tipo="error">{error}</Aviso>}

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

      {creando && (
        <FormularioConcepto
          alCerrar={() => setCreando(false)}
          alGuardar={() => {
            setCreando(false);
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

function FormularioConcepto({ alCerrar, alGuardar }) {
  const [valores, setValores] = useState({
    concepto: "",
    dia: "",
    importe: "",
    moneda: "COP",
    frecuencia: "mensual",
    tipo: "gasto",
    pago: "manual",
    notas: "",
  });
  const [error, setError] = useState(null);

  const cambiar = (campo) => (evento) =>
    setValores((previos) => ({ ...previos, [campo]: evento.target.value }));

  const enviar = async (evento) => {
    evento.preventDefault();
    try {
      await api.post("/api/presupuesto", { ...valores, dia: valores.dia || null });
      alGuardar();
    } catch (fallo) {
      setError(fallo.message);
    }
  };

  return (
    <Modal titulo="Nuevo concepto del presupuesto" alCerrar={alCerrar}>
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
