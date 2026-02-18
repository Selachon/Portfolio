import { Link } from "react-router-dom";
import PageShell from "../components/PageShell.jsx";
import { Block, BulletList, TagRow } from "../components/case/CaseSectionParts.jsx";
import { getPath } from "../app/paths.js";

const CASE_COPY = {
  es: {
    title: "Caso de estudio: FARES",
    subtitle:
      "De una web informativa a una plataforma de trabajo real: diseño, implementación en producción y mejora continua.",
    backLabel: "← Volver",
    summaryTitle: "Resumen",
    summaryText:
      "FARES necesitaba pasar de una presencia web básica a una plataforma para gestionar operación diaria. Construí la solución de punta a punta (frontend + backend), la desplegué en producción y continúo con mantenimiento evolutivo.",
    tags: ["Producción", "Node.js", "React (Vite)", "Mantenimiento", "Soporte"],
    sections: [
      {
        title: "Contexto y objetivo",
        body:
          "La empresa ya tenía una página en WordPress orientada a información. El reto fue construir una aplicación web para procesos reales del equipo, con base técnica estable y preparada para crecer.",
        bullets: [
          "Pasar de una web informativa a una plataforma operativa.",
          "Diseñar flujos claros para uso diario en producción.",
          "Dejar una base modular para evolución sin rehacer todo.",
        ],
      },
      {
        title: "Mi rol",
        body:
          "Participé en todo el ciclo del proyecto: arquitectura, desarrollo, despliegue y soporte continuo. El alcance evolucionó con feedback del equipo en uso real.",
        bullets: [
          "Frontend en React (Vite), con foco en claridad de uso.",
          "Backend en Node.js con lógica de negocio e integraciones.",
          "Soporte en producción: ajustes, correcciones y mejoras.",
          "Iteración continua sin romper funcionalidades activas.",
        ],
      },
      {
        title: "Qué se construyó",
        body:
          "Sin exponer detalles sensibles del negocio, la plataforma se diseñó para centralizar trabajo operativo y mejorar trazabilidad interna.",
        bullets: [
          "Módulos para gestión y seguimiento de tareas clave.",
          "Roles y permisos para controlar acceso por perfil.",
          "Flujos de creación, revisión y actualización de registros.",
          "Base preparada para añadir nuevas funciones por etapas.",
        ],
      },
      {
        title: "Decisiones técnicas",
        body:
          "El stack se eligió por velocidad de ejecución, mantenibilidad y estabilidad operativa. La prioridad fue construir algo sostenible, no complejo por apariencia.",
        bullets: [
          "React + Vite para un frontend rápido y modular.",
          "Node.js para backend y continuidad en iteraciones.",
          "Estructura clara, validaciones y manejo de errores.",
          "IA como acelerador, con control humano en decisiones y QA.",
        ],
      },
      {
        title: "Resultados e impacto",
        body:
          "El cambio principal fue operativo: pasar de tener una web a usar una herramienta de trabajo real todos los días.",
        bullets: [
          "Operación más centralizada y con mejor visibilidad.",
          "Menos fricción manual en procesos internos.",
          "Base técnica lista para nuevas mejoras sin retrabajo fuerte.",
        ],
      },
      {
        title: "Mantenimiento y evolución",
        body:
          "Este no fue un proyecto de entrega única. Sigue activo con mejoras iterativas, soporte y ajustes según uso real del equipo.",
        bullets: [
          "Correcciones y mejoras a partir de feedback real.",
          "Evolución por módulos para mantener estabilidad.",
          "Acompañamiento técnico continuo en producción.",
        ],
      },
    ],
    ctaTitle: "¿Hablamos?",
    ctaText: "Si necesitas construir o mejorar una plataforma, te puedo proponer una ruta técnica clara y realista.",
    ctaPrimary: "Contacto",
    ctaSecondary: "Ver proyectos",
  },
  en: {
    title: "Case study: FARES",
    subtitle:
      "From an informational website to a real work platform: architecture, production delivery, and continuous improvement.",
    backLabel: "← Back",
    summaryTitle: "Summary",
    summaryText:
      "FARES needed to move from a basic web presence to a platform used for day-to-day operations. I built the solution end to end (frontend + backend), deployed it to production, and continue with ongoing maintenance.",
    tags: ["Production", "Node.js", "React (Vite)", "Maintenance", "Support"],
    sections: [
      {
        title: "Context and goal",
        body:
          "The company already had a WordPress site focused on information. The challenge was to build a web app for real team workflows, with a stable technical foundation and room to scale.",
        bullets: [
          "Move from informational site to operational platform.",
          "Design clear workflows for daily production use.",
          "Leave a modular foundation for future growth.",
        ],
      },
      {
        title: "My role",
        body:
          "I worked across the full lifecycle: architecture, development, deployment, and continuous support. Scope evolved through real usage feedback from the team.",
        bullets: [
          "React (Vite) frontend focused on usability clarity.",
          "Node.js backend with business logic and integrations.",
          "Production support: fixes, adjustments, improvements.",
          "Continuous iteration without breaking active features.",
        ],
      },
      {
        title: "What was built",
        body:
          "Without exposing sensitive business details, the platform was designed to centralize operational work and improve internal traceability.",
        bullets: [
          "Core modules for operational management and tracking.",
          "Role and permission system by user profile.",
          "Create, review, and update workflows for records.",
          "Foundation ready for incremental features.",
        ],
      },
      {
        title: "Technical decisions",
        body:
          "The stack was selected for delivery speed, maintainability, and production stability. The goal was a sustainable product, not complexity for show.",
        bullets: [
          "React + Vite for a fast, modular frontend.",
          "Node.js backend for consistent iteration speed.",
          "Clear structure, validation, and error handling.",
          "AI used as an accelerator with human ownership of QA and architecture.",
        ],
      },
      {
        title: "Outcomes and impact",
        body:
          "The key result was operational: moving from just having a website to using an internal work tool daily.",
        bullets: [
          "More centralized operations and better visibility.",
          "Less manual friction in internal workflows.",
          "A technical base that supports new features without major rework.",
        ],
      },
      {
        title: "Maintenance and evolution",
        body:
          "This was not a one-time delivery. The platform remains active with iterative improvements, support, and updates based on real team usage.",
        bullets: [
          "Fixes and improvements driven by real feedback.",
          "Module-based evolution to protect stability.",
          "Ongoing technical ownership in production.",
        ],
      },
    ],
    ctaTitle: "Want to discuss your project?",
    ctaText: "If you need to build or improve a platform, I can map a clear and realistic technical path.",
    ctaPrimary: "Contact",
    ctaSecondary: "View projects",
  },
};

export default function CaseFares({ locale }) {
  const copy = CASE_COPY[locale] ?? CASE_COPY.es;
  const paths = {
    back: getPath("projects", locale),
    contact: getPath("contact", locale),
  };

  return (
    <PageShell
      title={copy.title}
      subtitle={copy.subtitle}
      right={<Link className="pill" to={paths.back}>{copy.backLabel}</Link>}
    >
      <div className="card" style={{ padding: 18 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ maxWidth: 760 }}>
            <div style={{ fontWeight: 850, letterSpacing: -0.2 }}>{copy.summaryTitle}</div>
            <div style={{ marginTop: 6, color: "var(--muted)", lineHeight: 1.75 }}>
              {copy.summaryText}
            </div>
          </div>
          <TagRow items={copy.tags} />
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 14 }}>
        {copy.sections.map((section) => (
          <div key={section.title} style={{ gridColumn: "span 12" }}>
            <Block title={section.title}>
              {section.body}
              <BulletList items={section.bullets} />
            </Block>
          </div>
        ))}
      </div>

      <div style={{ height: 14 }} />

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
          <div style={{ fontWeight: 820 }}>{copy.ctaTitle}</div>
          <div style={{ color: "var(--muted)", marginTop: 4 }}>
            {copy.ctaText}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn" to={paths.contact}>{copy.ctaPrimary}</Link>
          <Link className="btn btn-ghost" to={paths.back}>{copy.ctaSecondary}</Link>
        </div>
      </div>
    </PageShell>
  );
}
