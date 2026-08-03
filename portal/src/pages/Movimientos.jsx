// Panel de registros: consultar, filtrar, crear, corregir y exportar.

import { useState } from "react";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import { api, dinero, fechaLegible } from "../api.js";
import { useSesion } from "../sesion.js";
import {
  Aviso,
  Campo,
  Cargando,
  ConfirmarBorrado,
  Kpi,
  MetaLinea,
  Modal,
  SelectorEquivalencia,
  TablaVacia,
} from "../components/comunes.jsx";
import { useDatos } from "../hooks.js";

const FILTROS_VACIOS = { cuenta: "", anio: "", mes: "", sentido: "", categoria: "", texto: "" };

export default function Movimientos() {
  const { esPropietario } = useSesion();
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [convertirA, setConvertirA] = useState(null);
  const [editando, setEditando] = useState(null);
  const [creando, setCreando] = useState(false);
  const [borrando, setBorrando] = useState(null);

  const consulta = new URLSearchParams(
    Object.entries(filtros).filter(([, valor]) => valor !== ""),
  );
  consulta.set("limite", "300");
  if (convertirA) consulta.set("convertirA", convertirA);

  const { datos: todo, error, recargar } = useDatos(async () => {
    const [movimientos, cuentas, categorias] = await Promise.all([
      api.get(`/api/movimientos?${consulta}`),
      api.get("/api/cuentas"),
      api.get("/api/movimientos/categorias"),
    ]);
    return { ...movimientos, cuentas: cuentas.cuentas, categorias: categorias.categorias };
  }, [consulta.toString()]);

  const datos = todo;
  const cuentas = todo?.cuentas ?? [];
  const categorias = todo?.categorias ?? [];

  const cambiarFiltro = (campo) => (evento) =>
    setFiltros((previos) => ({ ...previos, [campo]: evento.target.value }));

  const borrar = async () => {
    await api.delete(`/api/movimientos/${borrando.id}`);
    setBorrando(null);
    recargar();
  };

  return (
    <>
      <MetaLinea partes={["Movimientos", datos ? `${datos.total} registros` : "cargando"]} />

      <div className="cabecera-pagina">
        <div>
          <h1>
            Movimientos
          </h1>
          <p>Todo lo que entra y sale, con su origen.</p>
        </div>
        <div className="acciones">
          <button className="principal" onClick={() => setCreando(true)}>
            <Plus size={14} /> Nuevo movimiento
          </button>
          <button onClick={() => api.descargar(`/api/movimientos/export.csv?${consulta}`)}>
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      <div className="panel filtros-panel aparece">
        <Campo etiqueta="Cuenta">
          <select value={filtros.cuenta} onChange={cambiarFiltro("cuenta")}>
            <option value="">Todas</option>
            {cuentas.map((cuenta) => (
              <option key={cuenta.id} value={cuenta.id}>
                {cuenta.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Año">
          <input value={filtros.anio} onChange={cambiarFiltro("anio")} placeholder="2026" />
        </Campo>
        <Campo etiqueta="Mes">
          <input value={filtros.mes} onChange={cambiarFiltro("mes")} placeholder="2" />
        </Campo>
        <Campo etiqueta="Sentido">
          <select value={filtros.sentido} onChange={cambiarFiltro("sentido")}>
            <option value="">Todos</option>
            <option value="ingreso">Ingresos</option>
            <option value="gasto">Gastos</option>
          </select>
        </Campo>
        <Campo etiqueta="Categoría">
          <select value={filtros.categoria} onChange={cambiarFiltro("categoria")}>
            <option value="">Todas</option>
            {categorias.map((fila) => (
              <option key={fila.categoria} value={fila.categoria}>
                {fila.categoria} ({fila.total})
              </option>
            ))}
          </select>
        </Campo>
        <SelectorEquivalencia
          moneda={cuentas.find((c) => c.id === filtros.cuenta)?.moneda ?? "COP"}
          convertirA={convertirA}
          alCambiar={setConvertirA}
        />
        <Campo etiqueta="Buscar en la descripción" className="filtro-busqueda">
          <input value={filtros.texto} onChange={cambiarFiltro("texto")} placeholder="p. ej. Bre-B" />
        </Campo>
        <button onClick={() => setFiltros(FILTROS_VACIOS)}>Limpiar</button>
      </div>

      {error && <Aviso tipo="error">{error}</Aviso>}

      {datos && (
        <>
          <div className="rejilla aparece" style={{ marginBottom: 16 }}>
            <Kpi etiqueta="Ingresos · filtrado" centavos={datos.totales.ingresos} />
            <Kpi etiqueta="Gastos · filtrado" centavos={datos.totales.gastos} />
            <Kpi etiqueta="Neto · filtrado" centavos={datos.totales.neto} />
          </div>

          {!filtros.cuenta && (
            <p className="tenue" style={{ marginTop: -8, marginBottom: 14 }}>
              Los totales suman todas las cuentas visibles. Filtra por una cuenta si mezclas
              pesos y dólares.
            </p>
          )}
          {datos.convertidoA && (
            <p className="tenue" style={{ marginTop: -8, marginBottom: 14 }}>
              La columna «En {datos.convertidoA}» es una equivalencia calculada con la TRM oficial
              del día de cada movimiento. Lo registrado no cambia de moneda.
            </p>
          )}
        </>
      )}

      {!datos ? (
        <Cargando />
      ) : (
        <div className="tabla-envoltura aparece">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Cuenta</th>
                <th className="num">Valor</th>
                {datos.convertidoA && <th className="num">En {datos.convertidoA}</th>}
                <th>Origen</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {datos.movimientos.length === 0 ? (
                <TablaVacia columnas={datos.convertidoA ? 8 : 7} texto="No hay movimientos con estos filtros." />
              ) : (
                datos.movimientos.map((movimiento) => (
                  <tr key={movimiento.id}>
                    <td className="cifra">{fechaLegible(movimiento.fecha)}</td>
                    <td>
                      {movimiento.descripcion}
                      {movimiento.notas && <div className="tenue">{movimiento.notas}</div>}
                    </td>
                    <td>
                      {movimiento.categoria ? (
                        <span className="etiqueta">{movimiento.categoria}</span>
                      ) : (
                        <span className="tenue">sin categoría</span>
                      )}
                    </td>
                    <td className="tenue">{movimiento.cuenta}</td>
                    <td className={`num ${movimiento.centavos < 0 ? "negativo" : "positivo"}`}>
                      {dinero(movimiento.centavos, movimiento.moneda)}
                    </td>
                    {datos.convertidoA && (
                      <td className="num tenue">
                        {movimiento.centavosConvertidos === undefined ||
                        movimiento.centavosConvertidos === null ? (
                          "—"
                        ) : (
                          <>
                            {dinero(movimiento.centavosConvertidos, datos.convertidoA)}
                            {movimiento.tasaUsada && (
                              <div className="tenue">
                                a {new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(movimiento.tasaUsada)}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    )}
                    <td className="tenue">{movimiento.origen}</td>
                    <td>
                      <div style={{ display: "flex", gap: 2 }}>
                        <button
                          className="icono"
                          onClick={() => setEditando(movimiento)}
                          aria-label="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        {esPropietario && (
                          <button
                            className="icono"
                            onClick={() => setBorrando(movimiento)}
                            aria-label="Borrar"
                          >
                            <Trash2 size={13} />
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

      {creando && (
        <FormularioMovimiento
          cuentas={cuentas}
          alCerrar={() => setCreando(false)}
          alGuardar={() => {
            setCreando(false);
            recargar();
          }}
        />
      )}

      {editando && (
        <FormularioMovimiento
          movimiento={editando}
          cuentas={cuentas}
          categorias={categorias}
          alCerrar={() => setEditando(null)}
          alGuardar={() => {
            setEditando(null);
            recargar();
          }}
        />
      )}

      {borrando && (
        <ConfirmarBorrado
          que={`${borrando.descripcion} · ${dinero(borrando.centavos, borrando.moneda)}`}
          alConfirmar={borrar}
          alCerrar={() => setBorrando(null)}
        />
      )}
    </>
  );
}

function FormularioMovimiento({ movimiento, cuentas, categorias = [], alCerrar, alGuardar }) {
  const editando = Boolean(movimiento);
  const [valores, setValores] = useState({
    cuentaId: movimiento?.cuentaId ?? cuentas[0]?.id ?? "",
    fecha: movimiento?.fecha ?? new Date().toISOString().slice(0, 10),
    descripcion: movimiento?.descripcion ?? "",
    importe: movimiento ? String(movimiento.centavos / 100) : "",
    categoria: movimiento?.categoria ?? "",
    notas: movimiento?.notas ?? "",
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
      if (editando) {
        await api.patch(`/api/movimientos/${movimiento.id}`, valores);
      } else {
        await api.post("/api/movimientos", valores);
      }
      alGuardar();
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal titulo={editando ? "Editar movimiento" : "Nuevo movimiento"} alCerrar={alCerrar}>
      <form onSubmit={enviar}>
        {error && <Aviso tipo="error">{error}</Aviso>}

        {!editando && (
          <Campo etiqueta="Cuenta">
            <select value={valores.cuentaId} onChange={cambiar("cuentaId")} required>
              {cuentas.map((cuenta) => (
                <option key={cuenta.id} value={cuenta.id}>
                  {cuenta.nombre} ({cuenta.moneda})
                </option>
              ))}
            </select>
          </Campo>
        )}

        <div className="campos">
          <Campo etiqueta="Fecha">
            <input type="date" value={valores.fecha} onChange={cambiar("fecha")} required />
          </Campo>
          <Campo etiqueta="Valor (negativo si es gasto)">
            <input
              value={valores.importe}
              onChange={cambiar("importe")}
              placeholder="-35700"
              required
            />
          </Campo>
        </div>

        <Campo etiqueta="Descripción">
          <input value={valores.descripcion} onChange={cambiar("descripcion")} required />
        </Campo>

        <Campo etiqueta="Categoría (si la dejas vacía, la asignan las reglas)">
          <input
            value={valores.categoria}
            onChange={cambiar("categoria")}
            list="categorias-conocidas"
          />
          <datalist id="categorias-conocidas">
            {categorias.map((fila) => (
              <option key={fila.categoria} value={fila.categoria} />
            ))}
          </datalist>
        </Campo>

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
