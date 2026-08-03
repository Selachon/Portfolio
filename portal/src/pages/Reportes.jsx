// Reportes mensuales: el cierre de cada mes con su extracto adjunto.

import { useCallback, useEffect, useState } from "react";
import { Download, Lock, LockOpen, Paperclip } from "lucide-react";
import { api, dinero, nombreMes } from "../api.js";
import { useSesion } from "../sesion.js";
import {
  Aviso,
  Cargando,
  Kpi,
  MetaLinea,
  NotaTasa,
  Panel,
  SelectorEquivalencia,
  SelectorMoneda,
  SelectorPeriodo,
} from "../components/comunes.jsx";

export default function Reportes() {
  const { esPropietario } = useSesion();
  const hoy = new Date();
  const [periodo, setPeriodo] = useState({ anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 });
  const [moneda, setMoneda] = useState("COP");
  const [convertirA, setConvertirA] = useState(null);
  const [datos, setDatos] = useState(null);
  const [periodos, setPeriodos] = useState([]);
  const [notas, setNotas] = useState("");
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [trabajando, setTrabajando] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const [reporte, lista] = await Promise.all([
        api.get(
          `/api/reportes/${periodo.anio}/${periodo.mes}?moneda=${moneda}` +
            (convertirA ? `&convertirA=${convertirA}` : ""),
        ),
        api.get("/api/reportes"),
      ]);
      setDatos(reporte);
      setPeriodos(lista.periodos);
      setNotas(reporte.reporte?.notas ?? "");
    } catch (fallo) {
      setError(fallo.message);
    }
  }, [periodo, moneda, convertirA]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const accion = async (ejecutar, textoExito) => {
    setTrabajando(true);
    setError(null);
    setMensaje(null);

    try {
      await ejecutar();
      setMensaje(textoExito);
      await cargar();
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setTrabajando(false);
    }
  };

  if (!datos) return error ? <Aviso tipo="error">{error}</Aviso> : <Cargando />;

  const { totales, comparativa, extractos, reporte, equivalencia } = datos;
  const cerrado = reporte?.estado === "cerrado";

  return (
    <>
      <MetaLinea
        partes={["Reportes", `${nombreMes(periodo.mes)} ${periodo.anio}`, moneda, cerrado ? "cerrado" : "borrador"]}
      />

      <div className="cabecera-pagina">
        <div>
          <h1>
            Reporte de <em>{nombreMes(periodo.mes)}</em>
            {cerrado && (
              <span className="etiqueta etiqueta--ok" style={{ marginLeft: 12, verticalAlign: "middle" }}>
                cerrado
              </span>
            )}
          </h1>
          <p>
            {totales.movimientos} movimiento(s) en {moneda} · {totales.periodo.dias} días
          </p>
        </div>
        <div className="filtros" style={{ margin: 0 }}>
          <SelectorPeriodo {...periodo} alCambiar={setPeriodo} />
          <SelectorMoneda
            moneda={moneda}
            alCambiar={(valor) => {
              setMoneda(valor);
              setConvertirA(null);
            }}
          />
          <SelectorEquivalencia moneda={moneda} convertirA={convertirA} alCambiar={setConvertirA} />
        </div>
      </div>

      {error && <Aviso tipo="error">{error}</Aviso>}
      {mensaje && <Aviso tipo="ok">{mensaje}</Aviso>}
      {datos.descuadre && (
        <Aviso tipo="atencion">
          {datos.descuadre.mensaje} Firmado: {dinero(datos.descuadre.congelado.totalCentavos, moneda)} ·
          ahora: {dinero(datos.descuadre.actual.totalCentavos, moneda)}.
        </Aviso>
      )}

      <div className="rejilla aparece" style={{ marginBottom: 22 }}>
        <Kpi etiqueta="Ingresos" centavos={totales.ingresosCentavos} moneda={moneda} />
        <Kpi etiqueta="Gastos" centavos={totales.gastosCentavos} moneda={moneda} />
        <Kpi etiqueta="Total" centavos={totales.totalCentavos} moneda={moneda} />
        <Kpi
          etiqueta="Promedio diario libre"
          centavos={totales.promedioDiarioCentavos}
          moneda={moneda}
          pie={`Total entre los ${totales.periodo.dias} días`}
        />
      </div>

      {equivalencia && (
        <Panel
          esquinas
          className="aparece"
          titulo={`El mismo mes visto en ${equivalencia.moneda}`}
          style={{ marginBottom: 22 }}
        >
          <div className="rejilla">
            <Kpi etiqueta="Ingresos" centavos={equivalencia.ingresosCentavos} moneda={equivalencia.moneda} />
            <Kpi etiqueta="Gastos" centavos={equivalencia.gastosCentavos} moneda={equivalencia.moneda} />
            <Kpi etiqueta="Total" centavos={equivalencia.totalCentavos} moneda={equivalencia.moneda} />
            <Kpi
              etiqueta="Promedio diario libre"
              centavos={equivalencia.promedioDiarioCentavos}
              moneda={equivalencia.moneda}
            />
          </div>
          <NotaTasa tasa={equivalencia.tasa} moneda={moneda} />
        </Panel>
      )}

      <div className="acciones" style={{ marginBottom: 22 }}>
        {!cerrado ? (
          <button
            className="principal"
            disabled={trabajando || totales.movimientos === 0}
            onClick={() =>
              accion(
                () => api.post(`/api/reportes/${periodo.anio}/${periodo.mes}/cerrar?moneda=${moneda}`, { notas }),
                "Mes cerrado. Las cifras quedaron congeladas.",
              )
            }
          >
            <Lock size={15} /> Cerrar el mes
          </button>
        ) : (
          esPropietario && (
            <button
              disabled={trabajando}
              onClick={() =>
                accion(
                  () => api.post(`/api/reportes/${periodo.anio}/${periodo.mes}/reabrir?moneda=${moneda}`),
                  "Mes reabierto.",
                )
              }
            >
              <LockOpen size={15} /> Reabrir
            </button>
          )
        )}
        <button
          onClick={() =>
            api.descargar(`/api/reportes/${periodo.anio}/${periodo.mes}/export.csv?moneda=${moneda}`)
          }
        >
          <Download size={15} /> Exportar CSV
        </button>
        <button onClick={() => window.print()}>Imprimir / PDF</button>
      </div>

      <div className="rejilla aparece" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))" }}>
        <TablaPivot titulo="Gastos" filas={totales.gastos} total={totales.gastosCentavos} moneda={moneda} />
        <TablaPivot titulo="Ingresos" filas={totales.ingresos} total={totales.ingresosCentavos} moneda={moneda} />
      </div>

      <div className="rejilla aparece" style={{ marginTop: 22 }}>
        <Panel esquinas titulo={<><Paperclip size={13} style={{ verticalAlign: "-2px" }} /> Extractos del mes</>}>
          {extractos.length === 0 ? (
            <p className="tenue">Sin extractos adjuntos.</p>
          ) : (
            <table className="tabla-limpia">
              <tbody>
                {extractos.map((extracto) => (
                  <tr key={extracto.id}>
                    <td>
                      {extracto.archivo}
                      <div className="tenue">{extracto.cuenta}</div>
                    </td>
                    <td className="num">
                      <button
                        className="discreto"
                        onClick={() => api.descargar(`/api/extractos/${extracto.id}/archivo`)}
                      >
                        abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel esquinas titulo="Notas del mes">
          <textarea
            aria-label="Notas del mes"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            disabled={cerrado}
            placeholder="Observaciones del asesor sobre este mes…"
          />
          {!cerrado && (
            <button
              style={{ marginTop: 10 }}
              disabled={trabajando}
              onClick={() =>
                accion(
                  () => api.put(`/api/reportes/${periodo.anio}/${periodo.mes}/notas?moneda=${moneda}`, { notas }),
                  "Notas guardadas.",
                )
              }
            >
              Guardar notas
            </button>
          )}
        </Panel>

        {comparativa && (
          <Panel esquinas titulo="Mes anterior">
            <p className="tenue" style={{ marginTop: 0 }}>
              {nombreMes(comparativa.periodo.mes)} de {comparativa.periodo.anio}
            </p>
            <table className="tabla-limpia">
              <tbody>
                <tr>
                  <td>Ingresos</td>
                  <td className="num positivo">{dinero(comparativa.ingresosCentavos, moneda)}</td>
                </tr>
                <tr>
                  <td>Gastos</td>
                  <td className="num negativo">{dinero(comparativa.gastosCentavos, moneda)}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Total</strong>
                  </td>
                  <td className="num">
                    <strong>{dinero(comparativa.totalCentavos, moneda)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </Panel>
        )}
      </div>

      <h2 style={{ margin: "30px 0 12px" }}>Todos los meses</h2>
      <div className="tabla-envoltura aparece">
        <table>
          <thead>
            <tr>
              <th>Mes</th>
              <th>Moneda</th>
              <th className="num">Movimientos</th>
              <th className="num">Neto</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {periodos.map((fila) => (
              <tr
                key={`${fila.anio}-${fila.mes}-${fila.moneda}`}
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setPeriodo({ anio: fila.anio, mes: fila.mes });
                  setMoneda(fila.moneda);
                }}
              >
                <td>
                  {nombreMes(fila.mes)} {fila.anio}
                </td>
                <td className="tenue">{fila.moneda}</td>
                <td className="num">{fila.movimientos}</td>
                <td className={`num ${fila.netoCentavos < 0 ? "negativo" : "positivo"}`}>
                  {dinero(fila.netoCentavos, fila.moneda)}
                </td>
                <td>
                  <span className={`etiqueta ${fila.estado === "cerrado" ? "etiqueta--ok" : ""}`}>
                    {fila.estado === "sin-reporte" ? "sin cerrar" : fila.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TablaPivot({ titulo, filas, total, moneda }) {
  return (
    <Panel esquinas titulo={titulo} extra={<span className="mono-uppr">{filas.length} categorías</span>}>
      <table className="tabla-limpia">
        <tbody>
          {filas.length === 0 ? (
            <tr>
              <td className="tenue">Sin movimientos.</td>
            </tr>
          ) : (
            <>
              {filas.map((fila) => (
                <tr key={fila.categoria}>
                  <td>
                    {fila.categoria} <span className="tenue">({fila.movimientos})</span>
                  </td>
                  <td className="num">{dinero(fila.centavos, moneda)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: "1px solid var(--hair-strong)" }}>
                <td style={{ paddingTop: 10 }}>
                  <strong>Suma total</strong>
                </td>
                <td className="num" style={{ paddingTop: 10 }}>
                  <strong>{dinero(total, moneda)}</strong>
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </Panel>
  );
}
