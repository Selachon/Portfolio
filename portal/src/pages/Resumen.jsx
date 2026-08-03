// Resumen del mes en curso: lo primero que se ve al entrar.

import { useState } from "react";
import { Link } from "react-router-dom";
import { api, dinero, nombreMes } from "../api.js";
import {
  Aviso,
  Barra,
  Cargando,
  Kpi,
  MetaLinea,
  NumeroAnimado,
  Panel,
  SelectorMoneda,
  SelectorPeriodo,
} from "../components/comunes.jsx";
import { useDatos } from "../hooks.js";

export default function Resumen() {
  const hoy = new Date();
  const [periodo, setPeriodo] = useState({ anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 });
  const [moneda, setMoneda] = useState("COP");

  const { datos, error } = useDatos(async () => {
    const [reporte, presupuesto, deudas] = await Promise.all([
      api.get(`/api/reportes/${periodo.anio}/${periodo.mes}?moneda=${moneda}`),
      api.get(`/api/presupuesto?anio=${periodo.anio}&mes=${periodo.mes}`),
      api.get("/api/deudas"),
    ]);
    return { ...reporte, presupuesto, deudas };
  }, [periodo.anio, periodo.mes, moneda]);

  if (error) return <Aviso tipo="error">{error}</Aviso>;
  if (!datos) return <Cargando />;

  const { totales, comparativa, extractos, presupuesto, deudas } = datos;

  const variacion =
    comparativa && comparativa.totalCentavos !== 0
      ? Math.round(
          ((totales.totalCentavos - comparativa.totalCentavos) / Math.abs(comparativa.totalCentavos)) * 100,
        )
      : null;

  return (
    <>
      <MetaLinea partes={["Resumen", `${nombreMes(periodo.mes)} ${periodo.anio}`, moneda]} />

      <div className="cabecera-pagina">
        <div>
          <h1>
            {nombreMes(periodo.mes)} de <em>{periodo.anio}</em>
          </h1>
          <p>
            {totales.movimientos} movimiento(s) registrados · {totales.periodo.dias} días
          </p>
        </div>
        <div className="filtros" style={{ margin: 0 }}>
          <SelectorPeriodo {...periodo} alCambiar={setPeriodo} />
          <SelectorMoneda moneda={moneda} alCambiar={setMoneda} />
        </div>
      </div>

      {datos.descuadre && <Aviso tipo="atencion">{datos.descuadre.mensaje}</Aviso>}

      <div className="rejilla aparece" style={{ marginBottom: 22 }}>
        <Kpi etiqueta="Ingresos" centavos={totales.ingresosCentavos} moneda={moneda} />
        <Kpi etiqueta="Gastos" centavos={totales.gastosCentavos} moneda={moneda} />
        <Kpi
          etiqueta="Total del mes"
          centavos={totales.totalCentavos}
          moneda={moneda}
          pie={
            comparativa && variacion !== null
              ? `${variacion > 0 ? "+" : ""}${variacion}% respecto a ${nombreMes(comparativa.periodo.mes)}`
              : undefined
          }
        />
        <Kpi
          etiqueta="Promedio diario libre"
          centavos={totales.promedioDiarioCentavos}
          moneda={moneda}
          pie={`Total entre los ${totales.periodo.dias} días del mes`}
        />
      </div>

      <div
        className="rejilla aparece"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))" }}
      >
        <PanelCategorias titulo="Gastos por categoría" filas={totales.gastos} moneda={moneda} />
        <PanelCategorias titulo="Ingresos por categoría" filas={totales.ingresos} moneda={moneda} />
      </div>

      <div className="rejilla aparece" style={{ marginTop: 22 }}>
        {presupuesto?.resumen && (
          <Panel
            esquinas
            titulo="Presupuesto del mes"
            extra={
              <Link to="/finanzas/presupuesto" className="mono-uppr">
                ver →
              </Link>
            }
          >
            <div className="kpi__etiqueta">Pendiente de pagar</div>
            <div className="kpi__valor">
              <NumeroAnimado
                valor={presupuesto.resumen.pendientesCentavos}
                formatear={(actual) => dinero(actual)}
              />
            </div>
            <p className="tenue" style={{ marginTop: 8 }}>
              {presupuesto.resumen.pendientes} concepto(s) sin marcar como pagados.
            </p>
          </Panel>
        )}

        {deudas?.resumen && (
          <Panel
            esquinas
            titulo="Deudas"
            extra={
              <Link to="/finanzas/deudas" className="mono-uppr">
                ver →
              </Link>
            }
          >
            <div className="kpi__etiqueta">Saldo pendiente</div>
            <div className="kpi__valor negativo">
              <NumeroAnimado
                valor={deudas.resumen.restanteCentavos}
                formatear={(actual) => dinero(actual)}
              />
            </div>
            <p className="tenue" style={{ marginTop: 8 }}>
              {deudas.resumen.cuotasPendientes} cuota(s) por pagar.
            </p>
          </Panel>
        )}

        <Panel
          esquinas
          titulo="Extractos del mes"
          extra={
            <Link to="/finanzas/importar" className="mono-uppr">
              subir →
            </Link>
          }
        >
          {extractos.length === 0 ? (
            <p className="tenue">Todavía no hay ningún extracto adjunto a este mes.</p>
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
      </div>
    </>
  );
}

function PanelCategorias({ titulo, filas, moneda }) {
  const total = filas.reduce((suma, fila) => suma + Math.abs(fila.centavos), 0);

  return (
    <Panel esquinas titulo={titulo} extra={<span className="mono-uppr">{filas.length} categorías</span>}>
      {filas.length === 0 ? (
        <p className="tenue">Sin movimientos.</p>
      ) : (
        <table className="tabla-limpia">
          <tbody>
            {filas.map((fila) => {
              const porcentaje = total > 0 ? Math.round((Math.abs(fila.centavos) / total) * 100) : 0;
              return (
                <tr key={fila.categoria}>
                  <td>
                    {fila.categoria}
                    <Barra porcentaje={porcentaje} />
                  </td>
                  <td className="num">
                    {dinero(fila.centavos, moneda)}
                    <div className="tenue">{porcentaje}%</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
