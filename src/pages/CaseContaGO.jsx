import { Link } from "react-router-dom";
import { getPath } from "../app/paths.js";
import PageShell from "../components/PageShell.jsx";
import { Block, BulletList, TagRow } from "../components/case/CaseSectionParts.jsx";

const CASE_COPY = {
  es: {
    title: "Caso de estudio: ContaGO",
    subtitle:
      "Lanzamiento digital para una firma contable emergente: presencia web, alcance comercial y base para servicios de pago.",
    backLabel: "← Volver",
    summaryTitle: "Resumen",
    summaryText:
      "ContaGO comenzó recientemente y necesitaba ganar visibilidad rápido. Trabajamos en conjunto para construir una presencia web clara y profesional, y convertir ese canal en una base para ofrecer herramientas contables de pago que simplifican tareas operativas de sus clientes.",
    tags: ["Lanzamiento", "Web corporativa", "Conversión", "Servicios de pago", "Escalabilidad"],
    sections: [
      {
        title: "Contexto y objetivo",
        body:
          "El reto principal no era solo tener una página web, sino usarla como palanca de crecimiento para una empresa nueva en el mercado contable.",
        bullets: [
          "Construir credibilidad digital desde cero.",
          "Ampliar alcance comercial fuera del canal tradicional.",
          "Transformar la web en un activo real de negocio.",
        ],
      },
      {
        title: "Trabajo en conjunto",
        body:
          "El proyecto se definió de forma colaborativa entre visión comercial y ejecución técnica. La prioridad fue alinear mensaje, experiencia y conversión.",
        bullets: [
          "Estructura de contenidos enfocada en claridad de servicios.",
          "Recorridos simples para facilitar contacto y decisión.",
          "Jerarquía visual orientada a confianza y acción.",
        ],
      },
      {
        title: "Qué se construyó",
        body:
          "Se desarrolló una web corporativa enfocada en captación y posicionamiento, con una base modular para evolucionar nuevas líneas de producto.",
        bullets: [
          "Arquitectura de sitio pensada para crecimiento por etapas.",
          "Secciones comerciales para servicios contables y tributarios.",
          "CTAs y puntos de contacto distribuidos estratégicamente.",
        ],
      },
      {
        title: "Línea de herramientas contables de pago",
        body:
          "A partir del potencial detectado, avanzamos hacia una propuesta de valor adicional: herramientas contables de pago para reducir fricción en tareas frecuentes.",
        bullets: [
          "Definición de oferta digital orientada a utilidad práctica.",
          "Base de producto para escalar servicios recurrentes.",
          "Enfoque en ahorro de tiempo y mejor orden operativo para usuarios.",
        ],
      },
      {
        title: "Impacto inicial",
        body:
          "La web permitió mejorar percepción de marca y abrir conversaciones con mayor calidad desde etapas tempranas del negocio.",
        bullets: [
          "Mayor alcance y mejor presentación comercial.",
          "Canal digital listo para conversion y seguimiento.",
          "Base técnica preparada para nuevas funcionalidades.",
        ],
      },
      {
        title: "Siguientes pasos",
        body:
          "El proyecto sigue vivo con iteraciones orientadas a negocio: mejoras de conversión, contenido y evolución de herramientas digitales.",
        bullets: [
          "Optimización continua de mensajes y embudo de contacto.",
          "Iteración de funcionalidades según uso real.",
          "Escalamiento progresivo de la oferta digital de pago.",
        ],
      },
    ],
    ctaTitle: "¿Quieres algo parecido para tu negocio?",
    ctaText:
      "Si estás en etapa de lanzamiento o crecimiento, puedo ayudarte a convertir tu web en una herramienta comercial real.",
    ctaPrimary: "Contacto",
    ctaSecondary: "Ver proyectos",
  },
  en: {
    title: "Case study: ContaGO",
    subtitle:
      "Digital launch for a growing accounting firm: web presence, commercial reach, and a foundation for paid services.",
    backLabel: "← Back",
    summaryTitle: "Summary",
    summaryText:
      "ContaGO was recently launched and needed to gain visibility quickly. We worked together to build a clear and professional web presence, then turned that channel into a foundation for paid accounting tools that simplify day-to-day operational work for clients.",
    tags: ["Launch", "Corporate website", "Conversion", "Paid services", "Scalability"],
    sections: [
      {
        title: "Context and goal",
        body:
          "The challenge was not only having a website, but using it as a growth lever for a newly launched accounting company.",
        bullets: [
          "Build digital credibility from day one.",
          "Expand commercial reach beyond traditional channels.",
          "Turn the website into a real business asset.",
        ],
      },
      {
        title: "Collaborative process",
        body:
          "The project was shaped through collaboration between commercial vision and technical execution. The priority was aligning message, experience, and conversion.",
        bullets: [
          "Content structure focused on service clarity.",
          "Simple user paths to support decision and contact.",
          "Visual hierarchy designed for trust and action.",
        ],
      },
      {
        title: "What was built",
        body:
          "A corporate site was delivered with clear positioning and lead capture goals, plus a modular foundation to expand with future digital products.",
        bullets: [
          "Site architecture designed for staged growth.",
          "Commercial pages for accounting and tax services.",
          "Strategically placed CTAs and contact touchpoints.",
        ],
      },
      {
        title: "Paid accounting tools initiative",
        body:
          "Once we validated market potential, we started a complementary value stream: paid accounting tools to reduce friction in recurring tasks.",
        bullets: [
          "Definition of a practical digital offer.",
          "Product-oriented base to scale recurring services.",
          "Focus on time savings and operational clarity for users.",
        ],
      },
      {
        title: "Early impact",
        body:
          "The website improved brand perception and enabled higher-quality commercial conversations in early business stages.",
        bullets: [
          "Broader reach and stronger commercial presentation.",
          "Digital channel ready for conversion and follow-up.",
          "Technical base prepared for further capabilities.",
        ],
      },
      {
        title: "Next steps",
        body:
          "The project remains active with business-driven iterations: conversion improvements, sharper messaging, and progressive evolution of digital tools.",
        bullets: [
          "Continuous optimization of messaging and contact funnel.",
          "Feature iteration based on real usage feedback.",
          "Progressive scaling of paid digital services.",
        ],
      },
    ],
    ctaTitle: "Need something similar for your business?",
    ctaText: "If you are in launch or growth stage, I can help turn your website into a real commercial tool.",
    ctaPrimary: "Contact",
    ctaSecondary: "View projects",
  },
};

export default function CaseContaGO({ locale }) {
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
            <div style={{ marginTop: 6, color: "var(--muted)", lineHeight: 1.75 }}>{copy.summaryText}</div>
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
          <div style={{ color: "var(--muted)", marginTop: 4 }}>{copy.ctaText}</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn" to={paths.contact}>{copy.ctaPrimary}</Link>
          <Link className="btn btn-ghost" to={paths.back}>{copy.ctaSecondary}</Link>
        </div>
      </div>
    </PageShell>
  );
}
