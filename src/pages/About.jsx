import PageShell from "../components/PageShell.jsx";
import { Link } from "react-router-dom";

function PhotoPlaceholder({ locale }) {
  const text = locale === "en" ? ["Photo", "updating"] : ["Foto", "en actualización"];

  return (
    <div
      className="card"
      style={{
        width: "100%",
        height: "100%",
        minHeight: 220,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--muted)",
        textAlign: "center",
        fontSize: 14,
      }}
    >
      {text[0]}
      <br />
      {text[1]}
    </div>
  );
}

const ABOUT_PATHS = {
  es: { contact: "/contacto" },
  en: { contact: "/contact" },
};

const ABOUT_COPY = {
  es: {
    title: "Sobre mí",
    subtitle: "Quién está detrás de KORA y cómo trabajo proyectos reales.",
    p1:
      "Soy José, aunque casi todo el mundo me conoce como Sela. Vengo del soporte técnico: sistemas en producción, incidentes reales y operación del día a día.",
    p2:
      "Esa base me obligó a pensar en estabilidad y mantenimiento antes que en adornos. Cuando desarrollo, no pienso solo en entregar: pienso en cómo se usa, cómo se sostiene y qué pasa cuando algo falla.",
    p3:
      "Con KORA by Sela junto ese enfoque operativo con desarrollo web y automatización. Mi objetivo es construir soluciones que sirvan al negocio hoy y no se rompan mañana.",
    workTitle: "Cómo trabajo",
    bullets: [
      "Alineo primero el objetivo del negocio y luego la solución técnica.",
      "Priorizo claridad, rendimiento y mantenibilidad en producción.",
      "Uso IA para acelerar el proceso, no para delegar la responsabilidad.",
      "Trabajo por iteraciones cortas para entregar valor desde temprano.",
    ],
    ctaTitle: "¿Tu proyecto necesita una base sólida?",
    ctaText: "Hablemos y te propongo una ruta técnica clara para construirlo o mejorarlo.",
    ctaButton: "Contactar",
  },
  en: {
    title: "About",
    subtitle: "Who is behind KORA and how I approach real-world projects.",
    p1:
      "I am Jose, but most people call me Sela. My foundation comes from technical support: production systems, real incidents, and day-to-day operations.",
    p2:
      "That background taught me to prioritize stability and maintainability over visual noise. When I build, I do not only think about delivery. I think about usage, support, and failure scenarios.",
    p3:
      "With KORA by Sela, I combine that operational mindset with web development and automation. My goal is to build solutions that drive business value today and stay reliable tomorrow.",
    workTitle: "How I work",
    bullets: [
      "I align business goals first, then shape the technical solution.",
      "I prioritize clarity, performance, and maintainability in production.",
      "I use AI to accelerate execution, not to outsource accountability.",
      "I work in short iterations to deliver value early.",
    ],
    ctaTitle: "Need a solid technical foundation?",
    ctaText: "Let us talk. I can map a clear technical path to build or improve your project.",
    ctaButton: "Contact",
  },
};

export default function About({ locale }) {
  const copy = ABOUT_COPY[locale] ?? ABOUT_COPY.es;
  const paths = ABOUT_PATHS[locale] ?? ABOUT_PATHS.es;

  return (
    <PageShell title={copy.title} subtitle={copy.subtitle}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: 14,
          alignItems: "start",
        }}
      >
        <div
          style={{
            gridColumn: "span 12",
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: 14,
            alignItems: "stretch",
          }}
        >
          <div className="about-photo">
            <PhotoPlaceholder locale={locale} />
          </div>

          <div className="about-text">
            <div className="card" style={{ padding: 18, height: "100%" }}>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>
                {copy.p1}
              </p>

              <div style={{ height: 12 }} />

              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>
                {copy.p2}
              </p>

              <div style={{ height: 12 }} />

              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>
                {copy.p3}
              </p>
            </div>
          </div>
        </div>

        <div style={{ gridColumn: "span 12" }}>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 780 }}>{copy.workTitle}</div>
            <ul
              style={{
                margin: "10px 0 0",
                paddingLeft: 18,
                color: "var(--muted)",
                lineHeight: 1.9,
              }}
            >
              {copy.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ gridColumn: "span 12" }}>
          <div
            className="card"
            style={{
              padding: 18,
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontWeight: 780 }}>{copy.ctaTitle}</div>
              <div style={{ color: "var(--muted)", marginTop: 4 }}>{copy.ctaText}</div>
            </div>
            <Link className="btn" to={paths.contact}>
              {copy.ctaButton}
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
