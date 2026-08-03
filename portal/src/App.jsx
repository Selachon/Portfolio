import { lazy, Suspense, useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import {
  ArrowLeftRight,
  ChartNoAxesCombined,
  FileText,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  Sun,
  Upload,
  Wallet,
  Landmark,
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

const Analitica = lazy(() => import("./pages/Analitica.jsx"));

const MENU = [
  { a: "/", texto: "Resumen", Icono: LayoutDashboard },
  { a: "/analitica", texto: "Analítica", Icono: ChartNoAxesCombined },
  { a: "/movimientos", texto: "Movimientos", Icono: ArrowLeftRight },
  { a: "/importar", texto: "Importar", Icono: Upload },
  { a: "/reportes", texto: "Reportes", Icono: FileText },
  { a: "/presupuesto", texto: "Presupuesto", Icono: Wallet },
  { a: "/deudas", texto: "Deudas", Icono: Landmark },
  { a: "/ajustes", texto: "Ajustes", Icono: Settings },
];

export default function App() {
  const { usuario, cargando, salir } = useSesion();
  const [tema, setTema] = useState(temaInicial);

  useEffect(() => {
    aplicarTema(tema);
  }, [tema]);

  if (cargando) return <Cargando texto="Abriendo el portal" />;
  if (!usuario) return <Login />;
  if (usuario.debeCambiarContrasena) return <CambiarContrasena />;

  return (
    <div className="app">
      {/* Retícula de fondo, la misma del sitio público. */}
      <div className="reticula" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} />
        ))}
      </div>

      <nav className="lateral">
        <div className="marca">
          <Logo />
          <span className="marca__sub">Portal financiero</span>
        </div>

        {MENU.map((opcion) => (
          <NavLink
            key={opcion.a}
            to={opcion.a}
            end={opcion.a === "/"}
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
              onClick={() => setTema(tema === "claro" ? "oscuro" : "claro")}
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
        <Routes>
          <Route path="/" element={<Resumen />} />
          <Route
            path="/analitica"
            element={
              <Suspense fallback={<Cargando texto="Abriendo analítica" />}>
                <Analitica />
              </Suspense>
            }
          />
          <Route path="/movimientos" element={<Movimientos />} />
          <Route path="/importar" element={<Importar />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/presupuesto" element={<Presupuesto />} />
          <Route path="/deudas" element={<Deudas />} />
          <Route path="/ajustes" element={<Ajustes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
