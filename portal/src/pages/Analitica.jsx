import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarDays, CircleDollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { api, dinero, fechaLegible, nombreMes } from "../api.js";
import {
  Aviso,
  Barra,
  Cargando,
  Kpi,
  MetaLinea,
  Panel,
  SelectorMoneda,
  SelectorPeriodo,
} from "../components/comunes.jsx";
import { useDatos } from "../hooks.js";

const COLORES_CATEGORIA = [
  "var(--accent)",
  "var(--accent-2)",
  "var(--ok)",
  "var(--warn)",
  "#67b7dc",
  "#ff8c69",
  "#a3e635",
];

function abreviar(centavos) {
  return new Intl.NumberFormat("es-CO", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(centavos) / 100);
}

function compactarCategorias(categorias) {
  if (categorias.length <= 6) return categorias;

  const principales = categorias.slice(0, 5);
  const otras = categorias.slice(5).reduce(
    (total, fila) => ({
      categoria: "Otras",
      magnitudCentavos: total.magnitudCentavos + fila.magnitudCentavos,
      movimientos: total.movimientos + fila.movimientos,
    }),
    { categoria: "Otras", magnitudCentavos: 0, movimientos: 0 },
  );
  return [...principales, otras];
}

function TooltipDinero({ active, payload, label, moneda, etiquetas = {} }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__titulo">{label}</div>
      {payload.map((entrada) => (
        <div className="chart-tooltip__fila" key={`${entrada.dataKey}-${entrada.name}`}>
          <span className="chart-tooltip__punto" style={{ background: entrada.color }} />
          <span>{etiquetas[entrada.dataKey] ?? entrada.name}</span>
          <strong>{dinero(entrada.value, moneda)}</strong>
        </div>
      ))}
    </div>
  );
}

function TooltipCategoria({ active, payload, moneda }) {
  if (!active || !payload?.length) return null;
  const fila = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__titulo">{fila.categoria}</div>
      <div className="chart-tooltip__fila">
        <span>{fila.movimientos} movimiento(s)</span>
        <strong>{dinero(-fila.magnitudCentavos, moneda)}</strong>
      </div>
    </div>
  );
}

function LeyendaFlujo() {
  return (
    <div className="chart-legend" aria-hidden="true">
      <span><i style={{ background: "var(--ok)" }} />Ingresos</span>
      <span><i style={{ background: "var(--bad)" }} />Gastos</span>
      <span><i className="linea" style={{ background: "var(--accent-2)" }} />Neto</span>
    </div>
  );
}

function SinDatos({ children }) {
  return <div className="chart-empty">{children}</div>;
}

export default function Analitica() {
  const [periodo, setPeriodo] = useState(null);
  const [moneda, setMoneda] = useState("COP");
  const [rango, setRango] = useState(6);

  const { datos, error } = useDatos(async () => {
    const { periodos } = await api.get("/api/reportes");
    const ultimo = periodos.find((fila) => fila.moneda === moneda);
    const hoy = new Date();
    const seleccionado = periodo ?? (ultimo
      ? { anio: ultimo.anio, mes: ultimo.mes }
      : { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 });
    return api.get(
      `/api/analitica?anio=${seleccionado.anio}&mes=${seleccionado.mes}` +
      `&moneda=${moneda}&meses=${rango}`,
    );
  }, [periodo?.anio, periodo?.mes, moneda, rango]);

  const categoriasGrafico = useMemo(
    () => compactarCategorias(datos?.categorias ?? []),
    [datos?.categorias],
  );

  if (error) return <Aviso tipo="error">{error}</Aviso>;
  if (!datos) return <Cargando texto="Calculando analítica" />;

  const { indicadores, serieMensual, serieDiaria, categorias } = datos;
  const mesSeleccionado = serieMensual.at(-1);
  const hayActividad = mesSeleccionado.movimientos > 0;
  const balancePromedio = indicadores.promedioNetoCentavos;

  return (
    <>
      <MetaLinea
        partes={[
          "Analítica",
          `${nombreMes(datos.periodo.mes)} ${datos.periodo.anio}`,
          moneda,
          `${rango} meses`,
        ]}
      />

      <div className="cabecera-pagina">
        <div>
          <h1>
            Lectura <em>financiera</em>
          </h1>
          <p>Tendencias, composición del gasto y ritmo del periodo.</p>
        </div>
        <div className="analitica-controles">
          <div className="segmentado" role="group" aria-label="Rango del análisis">
            {[6, 12].map((meses) => (
              <button
                key={meses}
                type="button"
                aria-pressed={rango === meses}
                onClick={() => setRango(meses)}
              >
                {meses} meses
              </button>
            ))}
          </div>
          <div className="filtros" style={{ margin: 0 }}>
            <SelectorPeriodo
              anio={datos.periodo.anio}
              mes={datos.periodo.mes}
              alCambiar={setPeriodo}
            />
            <SelectorMoneda
              moneda={moneda}
              alCambiar={(valor) => {
                setMoneda(valor);
                setPeriodo(null);
              }}
            />
          </div>
        </div>
      </div>

      <div className="rejilla analitica-kpis aparece">
        <Kpi
          etiqueta="Balance del periodo"
          centavos={mesSeleccionado.netoCentavos}
          moneda={moneda}
          pie={`${mesSeleccionado.movimientos} movimiento(s)`}
        />
        <Kpi
          etiqueta="Tasa de ahorro"
          valor={indicadores.tasaAhorro === null ? "—" : `${indicadores.tasaAhorro}%`}
          tono={indicadores.tasaAhorro === null ? "" : indicadores.tasaAhorro >= 0 ? "positivo" : "negativo"}
          pie="Balance sobre ingresos"
        />
        <Kpi
          etiqueta="Gasto mensual promedio"
          centavos={indicadores.promedioGastosCentavos}
          moneda={moneda}
          pie={`${serieMensual.filter((fila) => fila.movimientos > 0).length} mes(es) con actividad`}
        />
        <Kpi
          etiqueta="Días sin gasto"
          valor={`${indicadores.diasSinGasto}`}
          tono=""
          pie={`de ${datos.periodo.diasTranscurridos} día(s) observados`}
        />
      </div>

      <div className="analitica-grid aparece">
        <Panel
          esquinas
          className="analitica-grid__flujo"
          titulo="Flujo de caja"
          extra={<LeyendaFlujo />}
        >
          <div
            className="chart-frame chart-frame--grande"
            role="img"
            aria-label={`Ingresos, gastos y balance de los últimos ${rango} meses en ${moneda}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={serieMensual} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--hair)" vertical={false} />
                <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fill: "var(--ink-3)", fontSize: 10 }} />
                <YAxis tickFormatter={abreviar} tickLine={false} axisLine={false} width={66} tick={{ fill: "var(--ink-3)", fontSize: 10 }} />
                <ReferenceLine y={0} stroke="var(--hair-strong)" />
                <Tooltip
                  cursor={{ fill: "var(--accent-soft)" }}
                  content={
                    <TooltipDinero
                      moneda={moneda}
                      etiquetas={{
                        ingresosCentavos: "Ingresos",
                        gastosCentavos: "Gastos",
                        netoCentavos: "Neto",
                      }}
                    />
                  }
                />
                <Bar dataKey="ingresosCentavos" fill="var(--ok)" maxBarSize={34} />
                <Bar dataKey="gastosCentavos" fill="var(--bad)" maxBarSize={34} />
                <Line
                  type="monotone"
                  dataKey="netoCentavos"
                  stroke="var(--accent-2)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--bg-2)", strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="tenue chart-nota">
            Balance promedio del rango: <strong className={balancePromedio < 0 ? "negativo" : "positivo"}>
              {dinero(balancePromedio, moneda)}
            </strong>
          </p>
        </Panel>

        <Panel
          esquinas
          className="analitica-grid__categorias"
          titulo="Composición del gasto"
          extra={<span className="mono-uppr">{categorias.length} categorías</span>}
        >
          {categoriasGrafico.length === 0 ? (
            <SinDatos>Sin gastos en este periodo.</SinDatos>
          ) : (
            <>
              <div
                className="chart-frame chart-frame--dona"
                role="img"
                aria-label={`Distribución de gastos por categoría en ${nombreMes(datos.periodo.mes)}`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoriasGrafico}
                      dataKey="magnitudCentavos"
                      nameKey="categoria"
                      innerRadius={58}
                      outerRadius={92}
                      startAngle={90}
                      endAngle={-270}
                      paddingAngle={1}
                      stroke="var(--bg-2)"
                      strokeWidth={2}
                    >
                      {categoriasGrafico.map((fila, indice) => (
                        <Cell key={fila.categoria} fill={COLORES_CATEGORIA[indice % COLORES_CATEGORIA.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<TooltipCategoria moneda={moneda} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="dona-centro" aria-hidden="true">
                  <span>Gastos</span>
                  <strong>{abreviar(Math.abs(mesSeleccionado.gastosCentavos))}</strong>
                </div>
              </div>
              <div className="categorias-leyenda">
                {categorias.slice(0, 5).map((fila, indice) => (
                  <div key={fila.categoria}>
                    <i style={{ background: COLORES_CATEGORIA[indice % COLORES_CATEGORIA.length] }} />
                    <span title={fila.categoria}>{fila.categoria}</span>
                    <strong>{fila.porcentaje}%</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>
      </div>

      <Panel
        esquinas
        className="aparece analitica-diaria"
        titulo={`Ritmo diario · ${nombreMes(datos.periodo.mes)}`}
        extra={<span className="mono-uppr">acumulado del mes</span>}
      >
        {!hayActividad ? (
          <SinDatos>Este mes todavía no tiene movimientos.</SinDatos>
        ) : (
          <div
            className="chart-frame chart-frame--diario"
            role="img"
            aria-label={`Ingresos, gastos y balance acumulado por día de ${nombreMes(datos.periodo.mes)}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={serieDiaria} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--hair)" vertical={false} />
                <XAxis dataKey="dia" tickLine={false} axisLine={false} interval={4} tick={{ fill: "var(--ink-3)", fontSize: 10 }} />
                <YAxis tickFormatter={abreviar} tickLine={false} axisLine={false} width={66} tick={{ fill: "var(--ink-3)", fontSize: 10 }} />
                <ReferenceLine y={0} stroke="var(--hair-strong)" />
                <Tooltip
                  cursor={{ fill: "var(--accent-soft)" }}
                  labelFormatter={(dia) => `Día ${dia}`}
                  content={
                    <TooltipDinero
                      moneda={moneda}
                      etiquetas={{
                        ingresosCentavos: "Ingresos",
                        gastosCentavos: "Gastos",
                        acumuladoCentavos: "Acumulado",
                      }}
                    />
                  }
                />
                <Bar dataKey="ingresosCentavos" fill="var(--ok)" maxBarSize={18} />
                <Bar dataKey="gastosCentavos" fill="var(--bad)" maxBarSize={18} />
                <Line type="monotone" dataKey="acumuladoCentavos" stroke="var(--accent-2)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <div className="rejilla analitica-senales aparece">
        <Panel esquinas titulo="Lecturas del periodo">
          <div className="senales-lista">
            {indicadores.proyeccionGastosCentavos !== null && (
              <div className="senal">
                <CalendarDays size={16} />
                <div>
                  <span>Proyección al cierre</span>
                  <strong className="negativo">
                    {dinero(indicadores.proyeccionGastosCentavos, moneda)}
                  </strong>
                  <small>Si se mantiene el ritmo de gasto actual.</small>
                </div>
              </div>
            )}
            {indicadores.mayorGasto && (
              <div className="senal">
                <CircleDollarSign size={16} />
                <div>
                  <span>Mayor salida del mes</span>
                  <strong>{indicadores.mayorGasto.descripcion}</strong>
                  <small>
                    {dinero(indicadores.mayorGasto.centavos, moneda)} · {fechaLegible(indicadores.mayorGasto.fecha)}
                  </small>
                </div>
              </div>
            )}
            {!indicadores.proyeccionGastosCentavos && !indicadores.mayorGasto && (
              <p className="tenue">Todavía no hay suficiente actividad para generar lecturas.</p>
            )}
          </div>
        </Panel>

        <Panel esquinas titulo={`Extremos de los últimos ${rango} meses`}>
          <div className="senales-lista">
            {indicadores.mejorMes && (
              <div className="senal">
                <TrendingUp size={16} className="positivo" />
                <div>
                  <span>Mejor balance</span>
                  <strong className="positivo">
                    {dinero(indicadores.mejorMes.netoCentavos, moneda)}
                  </strong>
                  <small>{nombreMes(indicadores.mejorMes.mes)} de {indicadores.mejorMes.anio}</small>
                </div>
              </div>
            )}
            {indicadores.peorMes && (
              <div className="senal">
                <TrendingDown size={16} className="negativo" />
                <div>
                  <span>Balance más bajo</span>
                  <strong className={indicadores.peorMes.netoCentavos < 0 ? "negativo" : "positivo"}>
                    {dinero(indicadores.peorMes.netoCentavos, moneda)}
                  </strong>
                  <small>{nombreMes(indicadores.peorMes.mes)} de {indicadores.peorMes.anio}</small>
                </div>
              </div>
            )}
          </div>
        </Panel>

        <Panel esquinas titulo="Categorías principales">
          {categorias.length === 0 ? (
            <p className="tenue">Sin gastos para comparar.</p>
          ) : (
            <div className="ranking-categorias">
              {categorias.slice(0, 5).map((fila) => (
                <div key={fila.categoria}>
                  <div className="entre">
                    <span>{fila.categoria}</span>
                    <strong className="mono">{fila.porcentaje}%</strong>
                  </div>
                  <Barra porcentaje={fila.porcentaje} />
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
