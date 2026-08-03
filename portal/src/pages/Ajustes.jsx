// Ajustes: cuentas, reglas de categoría, personas con acceso y auditoría.

import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { api } from "../api.js";
import { useSesion } from "../sesion.js";
import { Aviso, Campo, Cargando, MetaLinea, Modal, TablaVacia } from "../components/comunes.jsx";
import { useDatos } from "../hooks.js";

const PESTANAS = [
  { id: "cuentas", titulo: "Cuentas" },
  { id: "reglas", titulo: "Reglas de categoría" },
  { id: "personas", titulo: "Personas con acceso", soloPropietario: true },
  { id: "auditoria", titulo: "Auditoría", soloPropietario: true },
];

export default function Ajustes() {
  const { esPropietario } = useSesion();
  const [pestana, setPestana] = useState("cuentas");

  const visibles = PESTANAS.filter((p) => !p.soloPropietario || esPropietario);

  return (
    <>
      <MetaLinea partes={["Ajustes", visibles.find((v) => v.id === pestana)?.titulo ?? ""]} />

      <div className="cabecera-pagina">
        <div>
          <h1>Ajustes</h1>
          <p>Cuentas, reglas de clasificación y quién tiene acceso.</p>
        </div>
      </div>

      <div className="acciones" style={{ marginBottom: 20 }}>
        {visibles.map((opcion) => (
          <button
            key={opcion.id}
            className={pestana === opcion.id ? "principal" : ""}
            onClick={() => setPestana(opcion.id)}
          >
            {opcion.titulo}
          </button>
        ))}
      </div>

      {pestana === "cuentas" && <Cuentas />}
      {pestana === "reglas" && <Reglas />}
      {pestana === "personas" && esPropietario && <Personas />}
      {pestana === "auditoria" && esPropietario && <Auditoria />}
    </>
  );
}

function Cuentas() {
  const [creando, setCreando] = useState(false);
  const { datos: cuentas, error, recargar } = useDatos(
    async () => (await api.get("/api/cuentas")).cuentas,
    [],
  );

  if (!cuentas) return error ? <Aviso tipo="error">{error}</Aviso> : <Cargando />;

  return (
    <>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <div className="entre" style={{ marginBottom: 10 }}>
        <p className="tenue" style={{ margin: 0 }}>
          La moneda de una cuenta no se puede cambiar después: los movimientos dependen de ella.
        </p>
        <button onClick={() => setCreando(true)}>
          <Plus size={14} /> Nueva cuenta
        </button>
      </div>

      <div className="tabla-envoltura aparece">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Moneda</th>
              <th className="num">Movimientos</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {cuentas.length === 0 ? (
              <TablaVacia columnas={6} texto="Crea la primera cuenta para empezar." />
            ) : (
              cuentas.map((cuenta) => (
                <tr key={cuenta.id}>
                  <td>{cuenta.nombre}</td>
                  <td className="tenue">{cuenta.tipo}</td>
                  <td className="cifra">{cuenta.moneda}</td>
                  <td className="num">{cuenta.movimientos}</td>
                  <td>
                    <span className={`etiqueta ${cuenta.activa ? "etiqueta--ok" : ""}`}>
                      {cuenta.activa ? "activa" : "inactiva"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="discreto"
                      onClick={async () => {
                        await api.patch(`/api/cuentas/${cuenta.id}`, { activa: !cuenta.activa });
                        recargar();
                      }}
                    >
                      {cuenta.activa ? "desactivar" : "activar"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {creando && (
        <FormularioCuenta
          alCerrar={() => setCreando(false)}
          alGuardar={() => {
            setCreando(false);
            recargar();
          }}
        />
      )}
    </>
  );
}

function FormularioCuenta({ alCerrar, alGuardar }) {
  const [valores, setValores] = useState({ nombre: "", tipo: "banco", moneda: "COP" });
  const [error, setError] = useState(null);

  const enviar = async (evento) => {
    evento.preventDefault();
    try {
      await api.post("/api/cuentas", valores);
      alGuardar();
    } catch (fallo) {
      setError(fallo.message);
    }
  };

  return (
    <Modal titulo="Nueva cuenta" alCerrar={alCerrar}>
      <form onSubmit={enviar}>
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Campo etiqueta="Nombre">
          <input
            value={valores.nombre}
            onChange={(e) => setValores({ ...valores, nombre: e.target.value })}
            required
            autoFocus
          />
        </Campo>
        <div className="campos">
          <Campo etiqueta="Tipo">
            <select value={valores.tipo} onChange={(e) => setValores({ ...valores, tipo: e.target.value })}>
              <option value="banco">Banco</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="cripto">Cripto</option>
              <option value="efectivo">Efectivo</option>
            </select>
          </Campo>
          <Campo etiqueta="Moneda (no se puede cambiar después)">
            <select value={valores.moneda} onChange={(e) => setValores({ ...valores, moneda: e.target.value })}>
              <option value="COP">COP</option>
              <option value="USD">USD</option>
            </select>
          </Campo>
        </div>
        <div className="acciones">
          <button className="principal" type="submit">
            Crear
          </button>
          <button type="button" onClick={alCerrar}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Reglas() {
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

  const { datos: reglas, error, recargar } = useDatos(
    async () => (await api.get("/api/reglas")).reglas,
    [],
  );

  const reclasificar = async (soloSimular) => {
    setMensaje(null);
    setErrorAccion(null);
    try {
      const resultado = await api.post("/api/reglas/reclasificar", { soloSimular });
      setMensaje(
        soloSimular
          ? `${resultado.cambios} movimiento(s) cambiarían de categoría.`
          : `${resultado.cambios} movimiento(s) reclasificados.`,
      );
    } catch (fallo) {
      setErrorAccion(fallo.message);
    }
  };

  if (!reglas) return error ? <Aviso tipo="error">{error}</Aviso> : <Cargando />;

  return (
    <>
      {(error || errorAccion) && <Aviso tipo="error">{error ?? errorAccion}</Aviso>}
      {mensaje && <Aviso tipo="ok">{mensaje}</Aviso>}

      <div className="entre" style={{ marginBottom: 10 }}>
        <p className="tenue" style={{ margin: 0 }}>
          Gana la regla con menor prioridad. Reclasificar solo toca los movimientos sin categoría.
        </p>
        <div className="acciones">
          <button onClick={() => reclasificar(true)}>Simular</button>
          <button onClick={() => reclasificar(false)}>
            <RefreshCw size={14} /> Reclasificar
          </button>
          <button onClick={() => setCreando(true)}>
            <Plus size={14} /> Nueva regla
          </button>
        </div>
      </div>

      <div className="tabla-envoltura aparece">
        <table>
          <thead>
            <tr>
              <th className="num">Prioridad</th>
              <th>Si la descripción…</th>
              <th>Patrón</th>
              <th>Categoría</th>
              <th>Aplica a</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {reglas.map((regla) => (
              <tr key={regla.id} style={{ opacity: regla.activa ? 1 : 0.45 }}>
                <td className="num">{regla.prioridad}</td>
                <td className="tenue">{regla.tipo}</td>
                <td className="cifra">{regla.patron}</td>
                <td>{regla.categoria}</td>
                <td className="tenue">{regla.sentido ?? "ingresos y gastos"}</td>
                <td>
                  <button
                    className="discreto"
                    onClick={async () => {
                      await api.patch(`/api/reglas/${regla.id}`, { activa: !regla.activa });
                      recargar();
                    }}
                  >
                    {regla.activa ? "desactivar" : "activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creando && (
        <FormularioRegla
          alCerrar={() => setCreando(false)}
          alGuardar={() => {
            setCreando(false);
            recargar();
          }}
        />
      )}
    </>
  );
}

function FormularioRegla({ alCerrar, alGuardar }) {
  const [valores, setValores] = useState({
    patron: "",
    tipo: "contiene",
    categoria: "",
    sentido: "",
    prioridad: 50,
  });
  const [error, setError] = useState(null);

  const cambiar = (campo) => (evento) =>
    setValores((previos) => ({ ...previos, [campo]: evento.target.value }));

  const enviar = async (evento) => {
    evento.preventDefault();
    try {
      await api.post("/api/reglas", valores);
      alGuardar();
    } catch (fallo) {
      setError(fallo.message);
    }
  };

  return (
    <Modal titulo="Nueva regla de categoría" alCerrar={alCerrar}>
      <form onSubmit={enviar}>
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Campo etiqueta="Patrón (lo que aparece en la descripción)">
          <input value={valores.patron} onChange={cambiar("patron")} required autoFocus />
        </Campo>
        <Campo etiqueta="Categoría que se asigna">
          <input value={valores.categoria} onChange={cambiar("categoria")} required />
        </Campo>
        <div className="campos">
          <Campo etiqueta="Coincidencia">
            <select value={valores.tipo} onChange={cambiar("tipo")}>
              <option value="contiene">Contiene</option>
              <option value="empieza">Empieza por</option>
              <option value="igual">Es exactamente</option>
              <option value="regex">Expresión regular</option>
            </select>
          </Campo>
          <Campo etiqueta="Aplica a">
            <select value={valores.sentido} onChange={cambiar("sentido")}>
              <option value="">Ingresos y gastos</option>
              <option value="ingreso">Solo ingresos</option>
              <option value="gasto">Solo gastos</option>
            </select>
          </Campo>
          <Campo etiqueta="Prioridad (menor gana)">
            <input type="number" value={valores.prioridad} onChange={cambiar("prioridad")} />
          </Campo>
        </div>
        <div className="acciones">
          <button className="principal" type="submit">
            Crear
          </button>
          <button type="button" onClick={alCerrar}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Personas() {
  const [creando, setCreando] = useState(false);
  const [contrasenaTemporal, setContrasenaTemporal] = useState(null);
  const { datos: usuarios, error, recargar } = useDatos(
    async () => (await api.get("/api/usuarios")).usuarios,
    [],
  );

  if (!usuarios) return error ? <Aviso tipo="error">{error}</Aviso> : <Cargando />;

  return (
    <>
      {error && <Aviso tipo="error">{error}</Aviso>}

      {contrasenaTemporal && (
        <Aviso tipo="atencion">
          Contraseña temporal: <strong className="cifra">{contrasenaTemporal}</strong>
          <br />
          Pásasela por un canal privado. No se puede volver a consultar; si se pierde, genera otra.
        </Aviso>
      )}

      <div className="entre" style={{ marginBottom: 10 }}>
        <p className="tenue" style={{ margin: 0 }}>
          El propietario gestiona todo. El asesor registra y analiza, pero no borra ni gestiona
          cuentas de acceso.
        </p>
        <button onClick={() => setCreando(true)}>
          <Plus size={14} /> Dar acceso a alguien
        </button>
      </div>

      <div className="tabla-envoltura aparece">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id}>
                <td>{usuario.nombre}</td>
                <td className="cifra">{usuario.correo}</td>
                <td>
                  <span className="etiqueta">{usuario.rol === "owner" ? "propietario" : "asesor"}</span>
                </td>
                <td>
                  <span className={`etiqueta ${usuario.activo ? "etiqueta--ok" : ""}`}>
                    {usuario.activo ? "activo" : "desactivado"}
                  </span>
                  {usuario.debeCambiarContrasena && (
                    <span className="etiqueta etiqueta--atencion" style={{ marginLeft: 6 }}>
                      contraseña temporal
                    </span>
                  )}
                </td>
                <td>
                  <div className="acciones">
                    <button
                      className="discreto"
                      onClick={async () => {
                        const { contrasenaTemporal: nueva } = await api.post(
                          `/api/usuarios/${usuario.id}/contrasena-temporal`,
                        );
                        setContrasenaTemporal(nueva);
                        recargar();
                      }}
                    >
                      reiniciar contraseña
                    </button>
                    <button
                      className="discreto"
                      onClick={async () => {
                        await api.patch(`/api/usuarios/${usuario.id}`, { activo: !usuario.activo });
                        recargar();
                      }}
                    >
                      {usuario.activo ? "desactivar" : "activar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creando && (
        <FormularioPersona
          alCerrar={() => setCreando(false)}
          alGuardar={(temporal) => {
            setCreando(false);
            setContrasenaTemporal(temporal);
            recargar();
          }}
        />
      )}
    </>
  );
}

function FormularioPersona({ alCerrar, alGuardar }) {
  const [valores, setValores] = useState({ correo: "", nombre: "", rol: "advisor" });
  const [error, setError] = useState(null);

  const enviar = async (evento) => {
    evento.preventDefault();
    try {
      const respuesta = await api.post("/api/usuarios", valores);
      alGuardar(respuesta.contrasenaTemporal);
    } catch (fallo) {
      setError(fallo.message);
    }
  };

  return (
    <Modal titulo="Dar acceso al portal" alCerrar={alCerrar}>
      <form onSubmit={enviar}>
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Campo etiqueta="Nombre">
          <input
            value={valores.nombre}
            onChange={(e) => setValores({ ...valores, nombre: e.target.value })}
            required
            autoFocus
          />
        </Campo>
        <Campo etiqueta="Correo">
          <input
            type="email"
            value={valores.correo}
            onChange={(e) => setValores({ ...valores, correo: e.target.value })}
            required
          />
        </Campo>
        <Campo etiqueta="Rol">
          <select value={valores.rol} onChange={(e) => setValores({ ...valores, rol: e.target.value })}>
            <option value="advisor">Asesor</option>
            <option value="owner">Propietario</option>
          </select>
        </Campo>
        <div className="acciones">
          <button className="principal" type="submit">
            Crear acceso
          </button>
          <button type="button" onClick={alCerrar}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Auditoria() {
  const { datos: eventos, error } = useDatos(
    async () => (await api.get("/api/auditoria?limite=200")).eventos,
    [],
  );

  if (!eventos) return error ? <Aviso tipo="error">{error}</Aviso> : <Cargando />;

  return (
    <>
      <p className="tenue">Todo lo que se escribe en el portal queda registrado aquí.</p>
      <div className="tabla-envoltura aparece">
        <table>
          <thead>
            <tr>
              <th>Cuándo</th>
              <th>Quién</th>
              <th>Qué</th>
              <th>Detalles</th>
            </tr>
          </thead>
          <tbody>
            {eventos.map((evento) => (
              <tr key={evento.id}>
                <td className="cifra tenue">{new Date(evento.fecha).toLocaleString("es-CO")}</td>
                <td>{evento.autor?.nombre ?? "—"}</td>
                <td className="cifra">{evento.accion}</td>
                <td className="tenue" style={{ fontSize: 12 }}>
                  {JSON.stringify(evento.detalles)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
