import { Link } from "react-router-dom";
import DemoLayout from "../../components/demo/DemoLayout.jsx";
import { getPath } from "../../app/paths.js";

const HUB_COPY = {
  es: {
    title: "Demo Hub",
    subtitle:
      "Espacios interactivos para probar UX, lógica de negocio y estados reales de aplicación antes de contratar implementación.",
    cards: [
      {
        title: "Blog CMS Demo",
        text:
          "Publica, edita y borra posts de prueba con persistencia local. Incluye estado borrador/publicado y vista detalle.",
        bullets: ["CRUD completo", "Persistencia localStorage", "Vista de post por slug"],
        routeKey: "demoBlog",
        cta: "Abrir blog demo",
      },
      {
        title: "Auth / Login Demo",
        text:
          "Flujo de acceso con sesión persistente, ruta protegida y control de logout para evaluar experiencia y estructura.",
        bullets: ["Login usable", "Sesión persistente", "Dashboard protegido"],
        routeKey: "demoLogin",
        cta: "Abrir auth demo",
      },
      {
        title: "B2B Automation Flow Lab",
        text:
          "Simula automatizaciones reales de negocio con ejecución por pasos, validaciones y trazabilidad completa de logs.",
        bullets: ["Escenarios ejecutables", "Timeline de eventos", "Resultado estructurado"],
        routeKey: "demoAutomation",
        cta: "Abrir automation lab",
      },
    ],
  },
  en: {
    title: "Demo Hub",
    subtitle:
      "Interactive spaces to test UX, business logic, and real application states before committing to implementation.",
    cards: [
      {
        title: "Blog CMS Demo",
        text:
          "Create, edit, and delete sample posts with local persistence. Includes draft/published states and post detail pages.",
        bullets: ["Full CRUD", "localStorage persistence", "Post detail by slug"],
        routeKey: "demoBlog",
        cta: "Open blog demo",
      },
      {
        title: "Auth / Login Demo",
        text:
          "Usable access flow with persistent session, protected route, and logout control to evaluate UX and structure.",
        bullets: ["Usable login", "Persistent session", "Protected dashboard"],
        routeKey: "demoLogin",
        cta: "Open auth demo",
      },
      {
        title: "B2B Automation Flow Lab",
        text:
          "Simulate real business automations with step execution, validations, and full event traceability.",
        bullets: ["Runnable scenarios", "Event timeline", "Structured output"],
        routeKey: "demoAutomation",
        cta: "Open automation lab",
      },
    ],
  },
};

export default function DemoHub({ locale }) {
  const copy = HUB_COPY[locale] ?? HUB_COPY.es;

  return (
    <DemoLayout locale={locale} title={copy.title} subtitle={copy.subtitle} theme="hub">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 14 }}>
        {copy.cards.map((card) => (
          <article key={card.title} className="card" style={{ gridColumn: "span 12", padding: 18 }}>
            <h2 style={{ margin: 0, fontSize: "clamp(1.2rem, 2.8vw, 1.45rem)", lineHeight: 1.2 }}>{card.title}</h2>
            <p style={{ margin: "10px 0 0", color: "var(--muted)", lineHeight: 1.75 }}>{card.text}</p>

            <ul style={{ margin: "12px 0 0", paddingLeft: 18, color: "var(--muted)", lineHeight: 1.8 }}>
              {card.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <div style={{ height: 12 }} />

            <Link className="btn" to={getPath(card.routeKey, locale)}>
              {card.cta}
            </Link>
          </article>
        ))}
      </div>
    </DemoLayout>
  );
}
