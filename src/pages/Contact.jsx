import { Link } from "react-router-dom";
import PageShell from "../components/PageShell.jsx";

const CONTACT_INFO = {
  email: "contact@korabysela.com",
};

const CONTACT_PATHS = {
  es: { projects: "/proyectos" },
  en: { projects: "/projects" },
};

const CONTACT_COPY = {
  es: {
    title: "Contacto",
    subtitle: "Cuéntame qué necesitas y te respondo con una propuesta clara.",
    emailLabel: "Correo",
    responseLabel: "Tiempo de respuesta",
    responseValue: "Normalmente en menos de 24 horas.",
    scopeLabel: "Cobertura",
    scopeValue: "Remoto para Colombia, LATAM y clientes internacionales.",
    upworkLabel: "Upwork",
    upworkValue: "Disponible para contratos por Upwork y trabajo directo.",
    ctaMail: "Escribir por correo",
    ctaProjects: "Ver proyectos",
  },
  en: {
    title: "Contact",
    subtitle: "Tell me what you need and I will reply with a clear proposal.",
    emailLabel: "Email",
    responseLabel: "Response time",
    responseValue: "Usually within 24 hours.",
    scopeLabel: "Coverage",
    scopeValue: "Remote for Colombia, LATAM, and international clients.",
    upworkLabel: "Upwork",
    upworkValue: "Available for both Upwork contracts and direct work.",
    ctaMail: "Email me",
    ctaProjects: "View projects",
  },
};

export default function Contact({ locale }) {
  const copy = CONTACT_COPY[locale] ?? CONTACT_COPY.es;
  const paths = CONTACT_PATHS[locale] ?? CONTACT_PATHS.es;

  return (
    <PageShell title={copy.title} subtitle={copy.subtitle}>
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <div style={{ fontWeight: 700 }}>{copy.emailLabel}</div>
            <div style={{ color: "var(--muted)", marginTop: 4 }}>{CONTACT_INFO.email}</div>
          </div>

          <div>
            <div style={{ fontWeight: 700 }}>{copy.responseLabel}</div>
            <div style={{ color: "var(--muted)", marginTop: 4 }}>{copy.responseValue}</div>
          </div>

          <div>
            <div style={{ fontWeight: 700 }}>{copy.scopeLabel}</div>
            <div style={{ color: "var(--muted)", marginTop: 4 }}>{copy.scopeValue}</div>
          </div>

          <div>
            <div style={{ fontWeight: 700 }}>{copy.upworkLabel}</div>
            <div style={{ color: "var(--muted)", marginTop: 4 }}>{copy.upworkValue}</div>
          </div>
        </div>

        <div style={{ height: 14 }} />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="btn" href={`mailto:${CONTACT_INFO.email}`}>
            {copy.ctaMail}
          </a>
          <Link className="btn btn-ghost" to={paths.projects}>
            {copy.ctaProjects}
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
