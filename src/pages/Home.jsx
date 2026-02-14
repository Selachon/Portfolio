import { Link } from "react-router-dom";
import PageShell from "../components/PageShell.jsx";
import { getPath } from "../app/paths.js";

function MiniCard({ title, children }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ fontWeight: 780, letterSpacing: -0.2 }}>{title}</div>
      <div style={{ marginTop: 8, color: "var(--muted)", lineHeight: 1.75 }}>{children}</div>
    </div>
  );
}

const HOME_COPY = {
  es: {
    titlePrefix: "Construyo soluciones web para negocio.",
    titleBrand: "Kora by Sela",
    subtitle:
      "Desarrollo sitios web, web apps y automatizaciones con foco en rendimiento, mantenibilidad y claridad operativa. Kora by Sela es mi marca personal de trabajo.",
    themeLabel: "Tema",
    statusLabel: "En operación",
    statusText:
      "Trabajo en soporte técnico mientras desarrollo y mantengo plataformas en producción. Mi enfoque es construir software que responda rápido, sea claro para el usuario y se sostenga bien en el tiempo.",
    ctaCase: "Ver caso: FARES",
    ctaDemos: "Probar demos",
    ctaProjects: "Ver proyectos",
    ctaContact: "Contacto",
    quickFacts: [
      { label: "Servicios", value: "Sitios web, web apps y automatización" },
      { label: "Modelo", value: "Construcción + soporte continuo" },
      { label: "Stack", value: "React, Node.js e IA aplicada" },
    ],
    approachTitle: "Mi enfoque",
    approachBody:
      "Primero entiendo objetivo y contexto del negocio. Después diseño una solución simple, sólida y escalable por módulos para no comprometer el futuro del proyecto.",
    stackTitle: "Stack real",
    stackBody:
      "Node.js como base para backend y automatizaciones. React + Vite para frontend cuando se necesita experiencia de uso cuidada. Elijo herramientas por resultado, no por moda.",
    aiTitle: "IA con criterio",
    aiBody:
      "Uso IA para acelerar investigación, implementación y validación. Las decisiones de arquitectura, QA y estabilidad final pasan por mí.",
  },
  en: {
    titlePrefix: "I build business-ready web solutions.",
    titleBrand: "Kora by Sela",
    subtitle:
      "I develop websites, web apps, and automations focused on performance, maintainability, and operational clarity. Kora by Sela is my personal service brand.",
    themeLabel: "Theme",
    statusLabel: "In operation",
    statusText:
      "I work in technical support while also building and maintaining production platforms. My focus is shipping software that performs fast, feels clear to users, and stays stable over time.",
    ctaCase: "View case: FARES",
    ctaDemos: "Try demos",
    ctaProjects: "View projects",
    ctaContact: "Contact",
    quickFacts: [
      { label: "Services", value: "Websites, web apps, and automation" },
      { label: "Model", value: "Build + continuous support" },
      { label: "Stack", value: "React, Node.js, and applied AI" },
    ],
    approachTitle: "Approach",
    approachBody:
      "I start by understanding business goals and operational context. Then I design a simple, solid, modular solution that can scale without technical debt chaos.",
    stackTitle: "Real stack",
    stackBody:
      "Node.js is my backend and automation foundation. React + Vite is my go-to frontend setup when UX matters. I pick tools by outcome, not hype.",
    aiTitle: "AI with accountability",
    aiBody:
      "I use AI to speed up research, implementation, and validation. Architecture decisions, QA, and production-grade quality are still fully owned by me.",
  },
};

export default function Home({ locale }) {
  const copy = HOME_COPY[locale] ?? HOME_COPY.es;
  const paths = {
    caseFares: getPath("caseFares", locale),
    demos: getPath("demos", locale),
    projects: getPath("projects", locale),
    contact: getPath("contact", locale),
  };

  return (
    <PageShell
      title={
        <>
          {copy.titlePrefix} <span className="accent">{copy.titleBrand}</span>.
        </>
      }
      subtitle={copy.subtitle}
      right={<span className="pill" style={{ color: "var(--muted)" }}>{copy.themeLabel} <span className="kbd">T</span></span>}
    >
      <div className="card" style={{ padding: 22, position: "relative", overflow: "hidden" }}>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: -2,
            background:
              "radial-gradient(520px 240px at 18% 10%, var(--accent-soft), transparent 70%), radial-gradient(520px 260px at 85% 30%, rgba(255,255,255,0.06), transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative" }}>
          <div className="pill" style={{ marginBottom: 12 }}>
            <span className="accent">●</span>
            <span style={{ color: "var(--muted)" }}>{copy.statusLabel}</span>
          </div>

          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.75, maxWidth: 860 }}>
            {copy.statusText}
          </p>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 8,
            }}
          >
            {copy.quickFacts.map((fact) => (
              <div
                key={fact.label}
                className="pill"
                style={{
                  display: "grid",
                  gap: 2,
                  alignItems: "start",
                  padding: "9px 11px",
                  borderColor: "color-mix(in srgb, var(--accent) 20%, var(--border))",
                  background: "color-mix(in srgb, var(--bg-elev) 88%, transparent)",
                }}
              >
                <strong style={{ fontSize: 12, letterSpacing: 0.2 }}>{fact.label}</strong>
                <span style={{ color: "var(--muted)", lineHeight: 1.4 }}>{fact.value}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <Link className="btn" to={paths.caseFares}>{copy.ctaCase}</Link>
            <Link className="btn btn-ghost" to={paths.demos}>{copy.ctaDemos}</Link>
            <Link className="btn btn-ghost" to={paths.projects}>{copy.ctaProjects}</Link>
            <Link className="btn btn-ghost" to={paths.contact}>{copy.ctaContact}</Link>
          </div>
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 }}>
        <MiniCard title={copy.approachTitle}>{copy.approachBody}</MiniCard>
        <MiniCard title={copy.stackTitle}>{copy.stackBody}</MiniCard>
        <MiniCard title={copy.aiTitle}>{copy.aiBody}</MiniCard>
      </div>
    </PageShell>
  );
}
