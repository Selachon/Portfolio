import { CONTENT } from "../../content/site.js";
import { useNav } from "../../app/useNav.js";
import PageHead from "../ui/PageHead.jsx";

// Generic case study, keyed by slug from CONTENT.cases.
export default function CaseView({ slug, locale }) {
  const go = useNav(locale);
  const data = CONTENT.cases[slug];
  if (!data) return null;
  const c = data[locale] ?? data.es;

  return (
    <div className="page fade-in">
      <PageHead
        eyebrow={c.eyebrow}
        title={c.title}
        sub={c.sub}
        right={
          <button type="button" className="btn" onClick={() => go("projects")}>
            <span style={{ transform: "scaleX(-1)" }} className="arrow">→</span> {locale === "es" ? "Volver" : "Back"}
          </button>
        }
      />

      <section>
        <div className="contact-grid">
          {c.meta.map((m) => (
            <div key={m.k}>
              <div className="contact-k">{m.k}</div>
              <div className="contact-v">{m.v}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel panel--ghost" style={{ border: 0, padding: 0 }}>
        <p
          style={{
            fontFamily: "var(--f-display)",
            fontSize: "clamp(20px, 2.2vw, 30px)",
            lineHeight: 1.35,
            letterSpacing: "-0.015em",
            color: "var(--ink)",
            margin: 0,
            maxWidth: "30ch",
          }}
        >
          {c.summary}
        </p>
      </section>

      <section>
        {c.sections.map((s) => (
          <div className="case-section" key={s.idx}>
            <div>
              <div className="case-section__label"><span className="idx">[ {s.idx} ]</span> {s.t.toUpperCase()}</div>
            </div>
            <div>
              <h2 className="case-section__t">{s.t}</h2>
              <p className="case-section__body">{s.body}</p>
              <ul className="bullets">
                {s.bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          </div>
        ))}
      </section>

      <section>
        <div className="section-rule">
          <span className="eyebrow">// TAGS</span>
          <span className="line" />
        </div>
        <div className="cluster">
          {c.tags.map((t) => <span key={t} className="tag">{t}</span>)}
        </div>
      </section>

      <section
        className="panel"
        style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center", justifyContent: "space-between" }}
      >
        <span className="panel__corner tl" /><span className="panel__corner tr" />
        <span className="panel__corner bl" /><span className="panel__corner br" />
        <div>
          <div className="display" style={{ fontSize: "clamp(22px, 2.6vw, 32px)" }}>
            {locale === "es" ? "¿Hablamos de tu proyecto?" : "Want to discuss your project?"}
          </div>
          <p style={{ color: "var(--ink-2)", marginTop: 8 }}>
            {locale === "es" ? "Te propongo una ruta técnica clara y realista." : "I can map a clear, realistic technical path."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn btn--solid" onClick={() => go("contact")}>
            {locale === "es" ? "Contacto" : "Contact"} <span className="arrow">→</span>
          </button>
          <button type="button" className="btn" onClick={() => go("projects")}>
            {locale === "es" ? "Ver proyectos" : "View projects"} <span className="arrow">→</span>
          </button>
        </div>
      </section>
    </div>
  );
}
