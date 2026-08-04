import { Component, lazy, Suspense, useEffect, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  Activity,
  ArrowLeftRight,
  Boxes,
  ChartNoAxesCombined,
  Database,
  FileText,
  Grid2X2,
  LayoutDashboard,
  LogOut,
  Moon,
  RefreshCw,
  Settings,
  Sun,
  Upload,
  Wallet,
  Landmark,
  ServerCog,
} from "lucide-react";
import { useSesion } from "./sesion.js";
import { aplicarTema, temaInicial } from "./tema.js";
import { Cargando } from "./components/comunes.jsx";
import Logo from "./components/Logo.jsx";
import Login from "./pages/Login.jsx";
import CambiarContrasena from "./pages/CambiarContrasena.jsx";
import Resumen from "./pages/Resumen.jsx";
import Movimientos from "./pages/Movimientos.jsx";
import Importar from "./pages/Importar.jsx";
import Reportes from "./pages/Reportes.jsx";
import Presupuesto from "./pages/Presupuesto.jsx";
import Deudas from "./pages/Deudas.jsx";
import Ajustes from "./pages/Ajustes.jsx";
import Portales from "./pages/Portales.jsx";

const CLAVE_RECARGA_MODULO = "kora:recarga-modulo:analitica";

async function cargarAnalitica() {
  try {
    const modulo = await import("./pages/Analitica.jsx");
    sessionStorage.removeItem(CLAVE_RECARGA_MODULO);
    return modulo;
  } catch (error) {
    if (!sessionStorage.getItem(CLAVE_RECARGA_MODULO)) {
      sessionStorage.setItem(CLAVE_RECARGA_MODULO, "1");
      window.location.reload();
      return new Promise(() => {});
    }

    sessionStorage.removeItem(CLAVE_RECARGA_MODULO);
    throw error;
  }
}

const Analitica = lazy(cargarAnalitica);
const Infraestructura = lazy(() => import("./pages/Infraestructura.jsx"));

const MENU_FINANZAS = [
  { a: "/finanzas", texto: "Resumen", Icono: LayoutDashboard },
  { a: "/finanzas/analitica", texto: "Analítica", Icono: ChartNoAxesCombined },
  { a: "/finanzas/movimientos", texto: "Movimientos", Icono: ArrowLeftRight },
  { a: "/finanzas/importar", texto: "Importar", Icono: Upload },
  { a: "/finanzas/reportes", texto: "Reportes", Icono: FileText },
  { a: "/finanzas/presupuesto", texto: "Presupuesto", Icono: Wallet },
  { a: "/finanzas/deudas", texto: "Deudas", Icono: Landmark },
  { a: "/finanzas/ajustes", texto: "Ajustes", Icono: Settings },
];

const MENU_INFRAESTRUCTURA = [
  { a: "/infraestructura", texto: "Estado general", Icono: ServerCog },
  { a: "/infraestructura/invitados", texto: "CT y VMs", Icono: Boxes },
  { a: "/infraestructura/almacenamiento", texto: "Almacenamiento", Icono: Database },
  { a: "/infraestructura/actividad", texto: "Actividad", Icono: Activity },
];

const RUTAS_ANTERIORES = [
  ["/analitica", "/finanzas/analitica"],
  ["/movimientos", "/finanzas/movimientos"],
  ["/importar", "/finanzas/importar"],
  ["/reportes", "/finanzas/reportes"],
  ["/presupuesto", "/finanzas/presupuesto"],
  ["/deudas", "/finanzas/deudas"],
  ["/ajustes", "/finanzas/ajustes"],
];

class LimiteVista extends Component {
  state = { fallo: null };

  static getDerivedStateFromError(fallo) {
    return { fallo };
  }

  componentDidCatch(fallo, informacion) {
    console.error("No se pudo abrir la vista", fallo, informacion);
  }

  render() {
    if (!this.state.fallo) return this.props.children;

    return (
      <section className="fallo-vista" role="alert">
        <AlertTriangle size={24} />
        <h2>No se pudo abrir esta sección</h2>
        <p>La versión del portal pudo cambiar mientras estaba abierta.</p>
        <button className="principal" onClick={() => window.location.reload()}>
          <RefreshCw size={14} /> Recargar portal
        </button>
      </section>
    );
  }
}

function Vistas() {
  const ubicacion = useLocation();

  return (
    <LimiteVista key={ubicacion.pathname}>
      <Routes>
        <Route path="/finanzas" element={<Resumen />} />
        <Route
          path="/finanzas/analitica"
          element={
            <Suspense fallback={<Cargando texto="Abriendo analítica" />}>
              <Analitica />
            </Suspense>
          }
        />
        <Route path="/finanzas/movimientos" element={<Movimientos />} />
        <Route path="/finanzas/importar" element={<Importar />} />
        <Route path="/finanzas/reportes" element={<Reportes />} />
        <Route path="/finanzas/presupuesto" element={<Presupuesto />} />
        <Route path="/finanzas/deudas" element={<Deudas />} />
        <Route path="/finanzas/ajustes" element={<Ajustes />} />
        <Route
          path="/infraestructura"
          element={
            <Suspense fallback={<Cargando texto="Abriendo infraestructura" />}>
              <Infraestructura vista="resumen" />
            </Suspense>
          }
        />
        <Route
          path="/infraestructura/invitados"
          element={
            <Suspense fallback={<Cargando texto="Cargando inventario" />}>
              <Infraestructura vista="invitados" />
            </Suspense>
          }
        />
        <Route
          path="/infraestructura/almacenamiento"
          element={
            <Suspense fallback={<Cargando texto="Leyendo almacenamiento" />}>
              <Infraestructura vista="almacenamiento" />
            </Suspense>
          }
        />
        <Route
          path="/infraestructura/actividad"
          element={
            <Suspense fallback={<Cargando texto="Leyendo actividad" />}>
              <Infraestructura vista="actividad" />
            </Suspense>
          }
        />
        {RUTAS_ANTERIORES.map(([anterior, nueva]) => (
          <Route key={anterior} path={anterior} element={<Navigate to={nueva} replace />} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LimiteVista>
  );
}

export default function App() {
  const { usuario, cargando, salir } = useSesion();
  const ubicacion = useLocation();
  const [tema, setTema] = useState(temaInicial);

  useEffect(() => {
    aplicarTema(tema);
  }, [tema]);

  if (cargando) return <Cargando texto="Abriendo el portal" />;
  if (!usuario) return <Login />;
  if (usuario.debeCambiarContrasena) return <CambiarContrasena />;

  const cambiarTema = () => setTema(tema === "claro" ? "oscuro" : "claro");

  if (ubicacion.pathname === "/" || ubicacion.pathname === "/portales") {
    return (
      <LimiteVista key={ubicacion.pathname}>
        <Portales
          usuario={usuario}
          tema={tema}
          alCambiarTema={cambiarTema}
          alSalir={salir}
        />
      </LimiteVista>
    );
  }

  const esInfraestructura = ubicacion.pathname.startsWith("/infraestructura");
  const menu = esInfraestructura ? MENU_INFRAESTRUCTURA : MENU_FINANZAS;

  return (
    <div className={`app ${esInfraestructura ? "app--infra" : ""}`}>
      {/* Retícula de fondo, la misma del sitio público. */}
      <div className="reticula" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} />
        ))}
      </div>

      <nav className="lateral">
        <div className="marca">
          <Logo />
          <span className="marca__sub">{esInfraestructura ? "Infraestructura" : "Finanzas"}</span>
        </div>

        <Link to="/" className="selector-portales-trigger">
          <Grid2X2 size={14} />
          <span>Todos los portales</span>
          <span aria-hidden="true">↗</span>
        </Link>

        {menu.map((opcion) => (
          <NavLink
            key={opcion.a}
            to={opcion.a}
            end={opcion.a === "/finanzas" || opcion.a === "/infraestructura"}
            className={({ isActive }) => `nav-enlace ${isActive ? "activo" : ""}`}
          >
            <opcion.Icono size={14} />
            {opcion.texto}
          </NavLink>
        ))}

        <div className="lateral-pie">
          <div className="lateral-pie__quien">
            {usuario.nombre}
            <div className="mono-uppr" style={{ marginTop: 3 }}>
              {usuario.rol === "owner" ? "Propietario" : "Asesor"}
            </div>
          </div>
          <div className="acciones">
            <button
              className="icono"
              onClick={cambiarTema}
              aria-label={tema === "claro" ? "Cambiar a tema oscuro" : "Cambiar a tema claro"}
              title="Cambiar tema"
            >
              {tema === "claro" ? <Moon size={14} /> : <Sun size={14} />}
            </button>
            <button className="discreto" onClick={salir}>
              <LogOut size={13} /> Salir
            </button>
          </div>
        </div>
      </nav>

      <main className="contenido">
        <Vistas />
      </main>
    </div>
  );
}
