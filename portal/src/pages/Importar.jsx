// Importación: subir el extracto en PDF o pegar la tabla.
//
// Los dos caminos terminan en la misma pantalla de revisión, y nada entra a la
// contabilidad hasta que alguien pulsa confirmar.

import { useEffect, useState } from "react";
import { FileUp, ClipboardPaste } from "lucide-react";
import { api, dinero, fechaLegible } from "../api.js";
import { Aviso, Campo, Kpi, MetaLinea, Panel, SelectorPeriodo } from "../components/comunes.jsx";

export default function Importar() {
  const hoy = new Date();
  const [cuentas, setCuentas] = useState([]);
  const [modo, setModo] = useState("pdf");
  const [cuentaId, setCuentaId] = useState("");
  const [periodo, setPeriodo] = useState({ anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 });
  const [revision, setRevision] = useState(null);
  const [error, setError] = useState(null);
  const [trabajando, setTrabajando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [pideContrasena, setPideContrasena] = useState(false);

  useEffect(() => {
    api.get("/api/cuentas").then(({ cuentas: lista }) => {
      const activas = lista.filter((cuenta) => cuenta.activa);
      setCuentas(activas);
      setCuentaId((previo) => previo || activas[0]?.id || "");
    });
  }, []);

  const reiniciar = () => {
    setRevision(null);
    setResultado(null);
    setError(null);
  };

  const subirPdf = async (archivo, contrasena) => {
    setError(null);
    setResultado(null);
    setTrabajando(true);

    try {
      const cuerpo = new FormData();
      cuerpo.append("cuentaId", cuentaId);
      cuerpo.append("anio", String(periodo.anio));
      cuerpo.append("mes", String(periodo.mes));
      if (contrasena) cuerpo.append("contrasena", contrasena);
      cuerpo.append("archivo", archivo);

      setRevision(await api.post("/api/extractos", cuerpo));
      setPideContrasena(false);
    } catch (fallo) {
      // Muchos bancos cifran el extracto; hay que poder pedir la clave y
      // reintentar en vez de dejar a quien sube con un error sin salida.
      if (fallo.detalles?.necesitaContrasena) setPideContrasena(true);
      setError(fallo.message);
    } finally {
      setTrabajando(false);
    }
  };

  const revisarPegado = async (contenido) => {
    setError(null);
    setResultado(null);
    setTrabajando(true);

    try {
      setRevision(
        await api.post("/api/movimientos/importar/revisar", {
          cuentaId,
          contenido,
          anioPorDefecto: periodo.anio,
        }),
      );
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setTrabajando(false);
    }
  };

  const confirmar = async (filasElegidas, duplicados) => {
    setTrabajando(true);
    setError(null);

    try {
      const movimientos = filasElegidas.map((fila) => ({
        fecha: fila.candidato.occurredOn,
        descripcion: fila.candidato.description,
        centavos: fila.candidato.amountCents,
        categoria: fila.candidato.category,
      }));

      const respuesta = revision.extractoId
        ? await api.post(`/api/extractos/${revision.extractoId}/confirmar`, { movimientos, duplicados })
        : await api.post("/api/movimientos/importar/confirmar", { cuentaId, movimientos, duplicados });

      setResultado(respuesta);
      setRevision(null);
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <>
      <MetaLinea partes={["Importar", revision ? "revisión" : modo === "pdf" ? "extracto en PDF" : "tabla pegada"]} />

      <div className="cabecera-pagina">
        <div>
          <h1>
            Importar <em>movimientos</em>
          </h1>
          <p>Nada se registra hasta que revises y confirmes.</p>
        </div>
      </div>

      {error && <Aviso tipo="error">{error}</Aviso>}

      {resultado && (
        <Aviso tipo="ok">
          Se registraron <strong>{resultado.insertados}</strong> movimiento(s).
          {resultado.omitidos > 0 && ` Se omitieron ${resultado.omitidos} por estar repetidos.`}
        </Aviso>
      )}

      {!revision && (
        <Panel esquinas className="aparece">
          <div className="acciones" style={{ marginBottom: 18 }}>
            <button className={modo === "pdf" ? "principal" : ""} onClick={() => setModo("pdf")}>
              <FileUp size={14} /> Extracto en PDF
            </button>
            <button className={modo === "pegar" ? "principal" : ""} onClick={() => setModo("pegar")}>
              <ClipboardPaste size={14} /> Pegar una tabla
            </button>
          </div>

          <div className="campos" style={{ marginBottom: 16 }}>
            <Campo etiqueta="Cuenta">
              <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}>
                {cuentas.map((cuenta) => (
                  <option key={cuenta.id} value={cuenta.id}>
                    {cuenta.nombre} ({cuenta.moneda})
                  </option>
                ))}
              </select>
            </Campo>
            <div className="filtros" style={{ margin: 0 }}>
              <SelectorPeriodo {...periodo} alCambiar={setPeriodo} />
            </div>
          </div>

          {modo === "pdf" ? (
            <SubidaPdf trabajando={trabajando} alSubir={subirPdf} pideContrasena={pideContrasena} />
          ) : (
            <PegarTabla trabajando={trabajando} alRevisar={revisarPegado} />
          )}
        </Panel>
      )}

      {revision && (
        <Revision
          revision={revision}
          trabajando={trabajando}
          alConfirmar={confirmar}
          alCancelar={reiniciar}
        />
      )}
    </>
  );
}

function SubidaPdf({ trabajando, alSubir, pideContrasena }) {
  const [archivo, setArchivo] = useState(null);
  const [contrasena, setContrasena] = useState("");

  return (
    <>
      <Campo etiqueta="Archivo del extracto (PDF)">
        <input type="file" accept="application/pdf,.pdf" onChange={(e) => setArchivo(e.target.files[0])} />
      </Campo>

      {pideContrasena && (
        <Campo etiqueta="Contraseña del PDF (los bancos suelen usar la cédula del titular)">
          <input
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            autoFocus
          />
        </Campo>
      )}

      <p className="tenue" style={{ marginBottom: 14 }}>
        El PDF se guarda como respaldo del mes. Si viene cifrado se te pedirá la contraseña;
        si es un escaneo (una imagen sin texto), el portal lo dirá y podrás pegar la tabla a mano.
      </p>
      <button
        className="principal"
        disabled={!archivo || trabajando}
        onClick={() => alSubir(archivo, contrasena)}
      >
        {trabajando ? "Leyendo el PDF…" : "Subir y leer"}
      </button>
    </>
  );
}

function PegarTabla({ trabajando, alRevisar }) {
  const [contenido, setContenido] = useState("");

  return (
    <>
      <Campo etiqueta="Pega aquí la tabla (CSV, columnas separadas por tabulación, o tabla en Markdown)">
        <textarea
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          placeholder={"Fecha\tDescripcion\tValor\n01 feb. 2026\tCompra\t-35,700.00"}
          rows={10}
        />
      </Campo>
      <button className="principal" disabled={!contenido.trim() || trabajando} onClick={() => alRevisar(contenido)}>
        {trabajando ? "Revisando…" : "Revisar"}
      </button>
    </>
  );
}

function Revision({ revision, trabajando, alConfirmar, alCancelar }) {
  const { filas, resumen, avisos = [], sinReconocer = [], perfil } = revision;
  const [incluirDuplicados, setIncluirDuplicados] = useState(false);
  const [excluidas, setExcluidas] = useState(new Set());

  const alternar = (indice) =>
    setExcluidas((previas) => {
      const copia = new Set(previas);
      copia.has(indice) ? copia.delete(indice) : copia.add(indice);
      return copia;
    });

  const elegidas = filas.filter(
    (fila) =>
      fila.estado !== "invalido" &&
      !excluidas.has(fila.indice) &&
      (incluirDuplicados || fila.estado !== "duplicado"),
  );

  const suma = elegidas.reduce((total, fila) => total + fila.candidato.amountCents, 0);

  return (
    <>
      <div className="rejilla aparece" style={{ marginBottom: 16 }}>
        <Kpi etiqueta="Nuevos" valor={String(resumen.nuevos)} tono="" />
        <Kpi etiqueta="Repetidos" valor={String(resumen.duplicados)} tono="" />
        <Kpi etiqueta="Con problemas" valor={String(resumen.invalidos)} tono="" />
        <Kpi
          etiqueta="Suma de lo elegido"
          centavos={suma}
          pie={perfil ? `Leído con el perfil "${perfil.nombre}"` : undefined}
        />
      </div>

      {avisos.map((aviso) => (
        <Aviso key={aviso} tipo="atencion">
          {aviso}
        </Aviso>
      ))}

      {sinReconocer.length > 0 && (
        <details className="panel" style={{ marginBottom: 16 }}>
          <summary style={{ cursor: "pointer" }}>
            {sinReconocer.length} línea(s) que parecían un movimiento y no se pudieron leer
          </summary>
          <ul style={{ fontSize: 12, fontFamily: "var(--f-mono)", color: "var(--ink-3)" }}>
            {sinReconocer.slice(0, 40).map((linea, indice) => (
              <li key={indice}>
                {linea.texto} <em>({linea.motivo})</em>
              </li>
            ))}
          </ul>
        </details>
      )}

      {resumen.duplicados > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <label style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 14 }}>
            <input
              type="checkbox"
              style={{ width: "auto" }}
              checked={incluirDuplicados}
              onChange={(e) => setIncluirDuplicados(e.target.checked)}
            />
            Registrar también los que parecen repetidos ({resumen.duplicados}). Márcalo solo si de
            verdad ocurrieron dos veces.
          </label>
        </div>
      )}

      <div className="tabla-envoltura aparece" style={{ marginBottom: 16 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }} />
              <th>Estado</th>
              <th>Fecha</th>
              <th>Descripción</th>
              <th>Categoría</th>
              <th className="num">Valor</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => {
              const invalida = fila.estado === "invalido";
              const excluida = excluidas.has(fila.indice);
              const duplicada = fila.estado === "duplicado";

              return (
                <tr key={fila.indice} style={{ opacity: invalida || excluida ? 0.45 : 1 }}>
                  <td>
                    <input
                      type="checkbox"
                      style={{ width: "auto" }}
                      disabled={invalida || (duplicada && !incluirDuplicados)}
                      checked={!invalida && !excluida && (!duplicada || incluirDuplicados)}
                      onChange={() => alternar(fila.indice)}
                    />
                  </td>
                  <td>
                    {invalida ? (
                      <span className="etiqueta etiqueta--atencion">problema</span>
                    ) : duplicada ? (
                      <span className="etiqueta etiqueta--atencion">repetido</span>
                    ) : (
                      <span className="etiqueta etiqueta--nuevo">nuevo</span>
                    )}
                  </td>
                  <td className="cifra">
                    {invalida ? "—" : fechaLegible(fila.candidato.occurredOn)}
                  </td>
                  <td>
                    {invalida ? (
                      <span className="tenue">{fila.problemas.join(" ")}</span>
                    ) : (
                      fila.candidato.description
                    )}
                  </td>
                  <td className="tenue">{fila.candidato?.category ?? "—"}</td>
                  <td
                    className={`num ${
                      !invalida && fila.candidato.amountCents < 0 ? "negativo" : "positivo"
                    }`}
                  >
                    {invalida ? "—" : dinero(fila.candidato.amountCents)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="acciones">
        <button
          className="principal"
          disabled={elegidas.length === 0 || trabajando}
          onClick={() => alConfirmar(elegidas, incluirDuplicados ? "insertar" : "omitir")}
        >
          {trabajando ? "Registrando…" : `Confirmar ${elegidas.length} movimiento(s)`}
          <span className="flecha">→</span>
        </button>
        <button onClick={alCancelar}>Cancelar</button>
      </div>
    </>
  );
}
