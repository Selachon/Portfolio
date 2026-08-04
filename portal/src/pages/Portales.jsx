import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  FileText,
  LogOut,
  Moon,
  ServerCog,
  Sun,
  Users,
  Wallet,
} from "lucide-react";
import Logo from "../components/Logo.jsx";

const PORTALES = [
  {
    id: "finanzas",
    indice: "01",
    nombre: "Finanzas",
    area: "Control financiero",
    descripcion: "Movimientos, presupuesto, deudas y lectura financiera.",
    estado: "Disponible",
    ruta: "/finanzas",
    color: "#2dd4bf",
    Icono: Wallet,
  },
  {
    id: "infraestructura",
    indice: "02",
    nombre: "Infraestructura",
    area: "Proxmox · Iroha",
    descripcion: "Estado, capacidad, CT, VMs, discos, alertas y actividad.",
    estado: "Disponible",
    ruta: "/infraestructura",
    color: "#f59e0b",
    Icono: ServerCog,
  },
  {
    id: "documentos",
    indice: "03",
    nombre: "Documentos",
    area: "Archivo y memoria",
    descripcion: "Un lugar común para documentos, acuerdos y referencias.",
    estado: "En preparación",
    color: "#38bdf8",
    Icono: FileText,
  },
  {
    id: "relaciones",
    indice: "04",
    nombre: "Relaciones",
    area: "Personas y aliados",
    descripcion: "Contactos, conversaciones y seguimiento de relaciones.",
    estado: "En preparación",
    color: "#fb7185",
    Icono: Users,
  },
];

const FORMATO_HORA = new Intl.DateTimeFormat("es-CO", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function movimientoReducido() {
  return typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function TarjetaPortal({ portal, orden, activo, alAbrir }) {
  const inclinar = (evento) => {
    if (movimientoReducido() || evento.pointerType === "touch") return;

    const tarjeta = evento.currentTarget;
    const limites = tarjeta.getBoundingClientRect();
    const x = (evento.clientX - limites.left) / limites.width - 0.5;
    const y = (evento.clientY - limites.top) / limites.height - 0.5;
    tarjeta.style.setProperty("--giro-x", `${y * -8}deg`);
    tarjeta.style.setProperty("--giro-y", `${x * 10}deg`);
    tarjeta.style.setProperty("--puntero-x", `${(x + 0.5) * 100}%`);
    tarjeta.style.setProperty("--puntero-y", `${(y + 0.5) * 100}%`);
  };

  const enderezar = (evento) => {
    evento.currentTarget.style.setProperty("--giro-x", "0deg");
    evento.currentTarget.style.setProperty("--giro-y", "0deg");
  };

  const contenido = (
    <>
      <span className="portal-card__borde" aria-hidden="true" />
      <div className="portal-card__cabecera">
        <span className="portal-card__indice">{portal.indice}</span>
        <span className="portal-card__estado">
          <i aria-hidden="true" /> {portal.estado}
        </span>
      </div>

      <div className="portal-card__centro">
        <span className="portal-card__icono" aria-hidden="true">
          <portal.Icono size={25} />
        </span>
        <div>
          <span className="portal-card__area">{portal.area}</span>
          <h2>{portal.nombre}</h2>
        </div>
      </div>

      <p>{portal.descripcion}</p>

      <div className="portal-card__pie">
        <span>{portal.ruta ? "Abrir portal" : "Próximamente"}</span>
        {portal.ruta ? <ArrowUpRight size={17} /> : <span className="portal-card__espera">···</span>}
      </div>

      <span className="portal-card__telemetria" aria-hidden="true">
        {Array.from({ length: 7 }, (_, indice) => <i key={indice} />)}
      </span>
    </>
  );

  const propiedades = {
    className: `portal-card ${portal.ruta ? "portal-card--activo" : "portal-card--futuro"} ${activo ? "portal-card--abriendo" : ""}`,
    style: { "--portal-accent": portal.color, "--orden": orden },
    onPointerMove: inclinar,
    onPointerLeave: enderezar,
  };

  if (portal.ruta) {
    return (
      <button {...propiedades} type="button" onClick={() => alAbrir(portal)}>
        {contenido}
      </button>
    );
  }

  return (
    <article {...propiedades} aria-disabled="true">
      {contenido}
    </article>
  );
}

export default function Portales({ usuario, tema, alCambiarTema, alSalir }) {
  const navegar = useNavigate();
  const cursorRef = useRef(null);
  const temporizadorRef = useRef(null);
  const [hora, setHora] = useState(() => new Date());
  const [portalActivo, setPortalActivo] = useState(null);
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    const reloj = window.setInterval(() => setHora(new Date()), 1000);
    return () => {
      window.clearInterval(reloj);
      window.clearTimeout(temporizadorRef.current);
    };
  }, []);

  const seguirPuntero = (evento) => {
    if (!cursorRef.current || evento.pointerType === "touch") return;
    cursorRef.current.style.transform = `translate3d(${evento.clientX}px, ${evento.clientY}px, 0)`;
  };

  const abrir = (portal) => {
    if (!portal.ruta) return;
    if (movimientoReducido()) {
      navegar(portal.ruta);
      return;
    }

    setPortalActivo(portal.id);
    setSaliendo(true);
    temporizadorRef.current = window.setTimeout(() => navegar(portal.ruta), 520);
  };

  return (
    <div className={`portales ${saliendo ? "portales--saliendo" : ""}`} onPointerMove={seguirPuntero}>
      <div className="portales__reticula" aria-hidden="true">
        {Array.from({ length: 12 }, (_, indice) => <span key={indice} />)}
      </div>
      <span ref={cursorRef} className="portales__cursor" aria-hidden="true" />
      <span className="portales__barrido portales__barrido--vertical" aria-hidden="true" />
      <span className="portales__barrido portales__barrido--horizontal" aria-hidden="true" />

      <header className="portales__cabecera">
        <Logo className="portales__logo" />
        <div className="portales__sesion">
          <span className="portales__usuario">
            {usuario.nombre}
            <small>{usuario.rol === "owner" ? "Propietario" : "Asesor"}</small>
          </span>
          <button
            className="icono"
            onClick={alCambiarTema}
            aria-label={tema === "claro" ? "Cambiar a tema oscuro" : "Cambiar a tema claro"}
            title="Cambiar tema"
          >
            {tema === "claro" ? <Moon size={15} /> : <Sun size={15} />}
          </button>
          <button className="discreto" onClick={alSalir}>
            <LogOut size={13} /> Salir
          </button>
        </div>
      </header>

      <div className="portales__ticker" aria-hidden="true">
        <div>
          {[...PORTALES, ...PORTALES].map((portal, indice) => (
            <span key={`${portal.id}-${indice}`}>{portal.indice} / {portal.nombre}</span>
          ))}
        </div>
      </div>

      <main className="portales__contenido">
        <section className="portales__intro">
          <div className="portales__meta">
            <span><i /> Sistema disponible</span>
            <span>{FORMATO_HORA.format(hora)}</span>
            <span>4 espacios</span>
          </div>
          <h1 aria-label="Kora">
            {[..."Kora"].map((letra, indice) => (
              <span key={letra + indice} style={{ "--letra": indice }}>{letra}</span>
            ))}
          </h1>
          <div className="portales__bajada">
            <p>Elige tu espacio.</p>
            <span>Un acceso, múltiples portales.</span>
          </div>
        </section>

        <nav className="portales__menu" aria-label="Portales de Kora">
          {PORTALES.map((portal, indice) => (
            <TarjetaPortal
              key={portal.id}
              portal={portal}
              orden={indice}
              activo={portalActivo === portal.id}
              alAbrir={abrir}
            />
          ))}
        </nav>
      </main>

      <footer className="portales__pie">
        <span>Kora / Directorio privado</span>
        <span>02 disponibles · 02 en preparación</span>
      </footer>
    </div>
  );
}
