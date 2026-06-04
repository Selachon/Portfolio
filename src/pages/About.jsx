import { useEffect, useState } from "react";
import { CONTENT } from "../content/site.js";
import { useNav } from "../app/useNav.js";
import PageHead from "../components/ui/PageHead.jsx";
import Crosshair from "../components/ui/Crosshair.jsx";
import aboutPhoto from "../assets/brand/about-photo.jpg";

export default function About({ locale }) {
  const c = CONTENT.about[locale] ?? CONTENT.about.es;
  const go = useNav(locale);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="page fade-in">
      <PageHead eyebrow={c.eyebrow} title={c.title} sub={c.sub} />

      <section className="about-grid">
        <div className="photo photo--filled">
          <img className="photo__img" src={aboutPhoto} alt={c.title} loading="lazy" />
          <div className="photo__crosshair">
            <Crosshair className="x-tl" /><Crosshair className="x-tr" />
            <Crosshair className="x-bl" /><Crosshair className="x-br" />
          </div>
        </div>

        <div className="about-text">
          <p>{c.p1}</p>
          <p>{c.p2}</p>
          <p>{c.p3}</p>
          <div style={{ marginTop: 18 }}>
            <button type="button" className="btn" onClick={() => setOpen(true)}>
              {c.originBtn} <span className="arrow">→</span>
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="section-rule">
          <span className="eyebrow">// {c.workTitle}</span>
          <span className="line" />
          <span className="eyebrow">
            {String(c.bullets.length).padStart(2, "0")} {locale === "es" ? "PRINCIPIOS" : "PRINCIPLES"}
          </span>
        </div>
        <div className="numlist">
          {c.bullets.map((b, i) => (
            <div className="numlist__item" key={i}>
              <span className="numlist__n">[ {String(i + 1).padStart(2, "0")} ]</span>
              <span className="numlist__t">{b}</span>
            </div>
          ))}
        </div>
      </section>

      <section
        className="panel"
        style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center", justifyContent: "space-between" }}
      >
        <span className="panel__corner tl" /><span className="panel__corner tr" />
        <span className="panel__corner bl" /><span className="panel__corner br" />
        <div>
          <div className="display" style={{ fontSize: "clamp(22px, 2.6vw, 32px)", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            {c.ctaTitle}
          </div>
          <p style={{ color: "var(--ink-2)", marginTop: 8 }}>{c.ctaText}</p>
        </div>
        <button type="button" className="btn btn--solid" onClick={() => go("contact")}>
          {c.ctaBtn} <span className="arrow">→</span>
        </button>
      </section>

      {open && (
        <div className="modal-back" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal__close" onClick={() => setOpen(false)} aria-label="Close">×</button>
            <div className="mono-uppr" style={{ color: "var(--ink-3)", marginBottom: 12 }}>// ORIGIN</div>
            <h3 className="display">{c.originTitle}</h3>
            {c.originParas.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
      )}
    </div>
  );
}
