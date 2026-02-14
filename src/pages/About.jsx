import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { getPath } from "../app/paths.js";
import PageShell from "../components/PageShell.jsx";

function PhotoPlaceholder({ locale }) {
  const text = locale === "en" ? ["Photo", "updating"] : ["Foto", "en actualizacion"];

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

const ABOUT_COPY = {
  es: {
    title: "Sobre mí",
    subtitle: "Quién es Jose, qué representa Sela y cómo trabajo Kora como servicio web.",
    p1:
      "Soy Jose. Sela no es solo un apodo: es mi marca personal y mi firma de trabajo, la forma en la que estructuro y ejecuto proyectos de principio a fin.",
    p2:
      "Kora es el servicio con el que ayudo a negocios y equipos a construir sitios web, landing pages, web apps y automatizaciones con foco en resultados reales.",
    p3:
      "Mi base viene del soporte técnico y de operar sistemas en producción: incidentes reales, mantenimiento continuo y decisiones con impacto. Por eso priorizo claridad, rendimiento y mantenibilidad desde el día uno.",
    originTitle: "Origen de Kora",
    originButton: "Ver origen de Kora",
    originClose: "Cerrar",
    originParagraphs: [
      "El nombre Kora nace de core: el núcleo digital que sostiene un negocio. Mi enfoque es construir primero ese núcleo con orden y luego escalarlo sin perder claridad.",
      "También nace de ora, del ahora. Porque las ideas no viven en espera. Con el uso estratégico de IA se obtienen resultados de alta calidad en tiempos oportunos, convirtiendo visión en ejecución real.",
      "Y, al final, también hay algo de (Kora)zón. Porque detrás de cada sistema, cada automatización y cada estructura, hay intención.",
      "Kora es núcleo, es presente y es propósito. Estructura con dirección. Tecnología con sentido.",
    ],
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
    subtitle: "Who Jose is, what Sela represents, and how I run Kora as a web service.",
    p1:
      "I am Jose. Sela is not only a nickname; it is my personal brand and professional signature, the way I structure and execute projects end to end.",
    p2:
      "Kora is the service through which I help teams and businesses build websites, landing pages, web apps, and automations focused on real outcomes.",
    p3:
      "My foundation comes from technical support and production operations: real incidents, ongoing maintenance, and high-impact decisions. That is why I prioritize clarity, performance, and maintainability from day one.",
    originTitle: "Kora origin",
    originButton: "See Kora origin",
    originClose: "Close",
    originParagraphs: [
      "The name Kora comes from core: the digital nucleus that sustains a business. My approach is to build that nucleus first, with structure and clarity, and then scale it without losing direction.",
      "It also echoes ora, the now. Because ideas should not wait. Through the strategic use of AI, high-quality results are delivered at the right time, turning vision into execution.",
      "And finally, there is also a subtle reference to heart. Because behind every system, every automation, and every structure, there is intention.",
      "Kora stands for core, now, and heart. Structure with direction. Technology with purpose.",
    ],
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

const MODAL_EASE = [0.22, 1, 0.36, 1];
const MotionDiv = motion.div;

export default function About({ locale }) {
  const copy = ABOUT_COPY[locale] ?? ABOUT_COPY.es;
  const contactPath = getPath("contact", locale);
  const modalRef = useRef(null);
  const [originModal, setOriginModal] = useState({
    open: false,
    left: 16,
    top: 16,
  });

  const closeOriginModal = () => {
    setOriginModal((current) => ({ ...current, open: false }));
  };

  const openOriginModal = (event) => {
    const margin = 12;
    const estimatedWidth = Math.min(520, window.innerWidth - margin * 2);
    const estimatedHeight = Math.min(500, window.innerHeight - margin * 2);

    let nextLeft = event.clientX + 12;
    let nextTop = event.clientY + 12;

    if (nextLeft + estimatedWidth > window.innerWidth - margin) {
      nextLeft = window.innerWidth - estimatedWidth - margin;
    }

    if (nextTop + estimatedHeight > window.innerHeight - margin) {
      nextTop = Math.max(margin, event.clientY - estimatedHeight - 12);
    }

    setOriginModal({
      open: true,
      left: Math.max(margin, nextLeft),
      top: Math.max(margin, nextTop),
    });
  };

  useEffect(() => {
    if (!originModal.open) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        closeOriginModal();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [originModal.open]);

  useEffect(() => {
    if (!originModal.open || !modalRef.current) return;

    const margin = 12;
    const rect = modalRef.current.getBoundingClientRect();

    let nextLeft = originModal.left;
    let nextTop = originModal.top;

    if (nextLeft + rect.width > window.innerWidth - margin) {
      nextLeft = Math.max(margin, window.innerWidth - rect.width - margin);
    }

    if (nextTop + rect.height > window.innerHeight - margin) {
      nextTop = Math.max(margin, window.innerHeight - rect.height - margin);
    }

    if (nextLeft !== originModal.left || nextTop !== originModal.top) {
      setOriginModal((current) => ({
        ...current,
        left: nextLeft,
        top: nextTop,
      }));
    }
  }, [originModal]);

  return (
    <>
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
                <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>{copy.p1}</p>

                <div style={{ height: 12 }} />

                <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>{copy.p2}</p>

                <div style={{ height: 12 }} />

                <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>{copy.p3}</p>

                <div style={{ height: 14 }} />

                <button type="button" className="btn btn-ghost" onClick={openOriginModal}>
                  {copy.originButton}
                </button>
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
              <Link className="btn" to={contactPath}>
                {copy.ctaButton}
              </Link>
            </div>
          </div>
        </div>
      </PageShell>

      <AnimatePresence>
        {originModal.open ? (
          <MotionDiv
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeOriginModal();
              }
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: "linear" }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 140,
              background: "color-mix(in srgb, var(--bg) 38%, transparent)",
            }}
          >
            <MotionDiv
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="kora-origin-title"
              onMouseDown={(event) => event.stopPropagation()}
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 4 }}
              transition={{ duration: 0.2, ease: MODAL_EASE }}
              style={{
                position: "fixed",
                left: originModal.left,
                top: originModal.top,
                width: "min(520px, calc(100vw - 24px))",
                maxHeight: "min(72vh, 560px)",
                overflowY: "auto",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: 18,
                background: "color-mix(in srgb, var(--bg-elev) 96%, var(--bg))",
                boxShadow: "var(--shadow)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <strong id="kora-origin-title">{copy.originTitle}</strong>
                <button type="button" className="pill" onClick={closeOriginModal}>
                  {copy.originClose}
                </button>
              </div>

              <div style={{ height: 8 }} />

              <div style={{ display: "grid", gap: 10 }}>
                {copy.originParagraphs.map((paragraph) => (
                  <p key={paragraph} style={{ margin: 0, color: "var(--muted)", lineHeight: 1.75 }}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </MotionDiv>
          </MotionDiv>
        ) : null}
      </AnimatePresence>
    </>
  );
}
