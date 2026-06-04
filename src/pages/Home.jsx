import { CONTENT } from "../content/site.js";
import { useNav } from "../app/useNav.js";
import StatusTicker from "../components/ui/StatusTicker.jsx";
import ProjectRow from "../components/ui/ProjectRow.jsx";

export default function Home({ locale }) {
  const c = CONTENT.home[locale] ?? CONTENT.home.es;
  const go = useNav(locale);
  const featured = CONTENT.items.filter((p) => p.featured);

  return (
    <div className="page fade-in">
      {/* HERO */}
      <section className="hero">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="mono-uppr" style={{ color: "var(--ink-3)" }}>
            <span style={{ color: "var(--accent)" }}>●</span> {c.eyebrow}
          </span>
          <span className="mono-uppr" style={{ color: "var(--ink-3)", opacity: 0.5 }}>/</span>
          <span className="mono-uppr" style={{ color: "var(--ink-3)" }}>v2026.05</span>
        </div>

        <h1 className="hero__title display">
          {c.titleLine1} <em className="ital">{c.titleItalic}</em>{c.titleLine2}
        </h1>

        <div className="hero__split">
          <div>
            <p className="hero__sub">{c.sub}</p>
            <div className="hero__ctas">
              <button type="button" className="btn btn--solid" onClick={() => go("caseFares")}>
                {c.ctaPrimary} <span className="arrow">→</span>
              </button>
              <button type="button" className="btn" onClick={() => go("demos")}>
                {c.ctaSecondary} <span className="arrow">→</span>
              </button>
            </div>

            <div className="note" style={{ marginTop: 28 }}>{c.footnoteHero}</div>
          </div>

          <StatusTicker items={c.ticker} label={c.statusLabel} footer={c.statusFooter} />
        </div>
      </section>

      {/* STATS */}
      <section>
        <div className="stats">
          {c.stats.map((s) => (
            <div key={s.k}>
              <div className="stats__k">{s.k}</div>
              <div className="stats__v display">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* APPROACH */}
      <section>
        <div className="section-rule">
          <span className="eyebrow">{c.sectionWork}</span>
          <span className="line" />
          <span className="eyebrow">03 / ITEMS</span>
        </div>
        <div className="feats">
          {c.feats.map((f) => (
            <article key={f.idx}>
              <div className="feats__idx">
                <span className="accent">[ {f.idx} ]</span>
                <span>{f.tag}</span>
              </div>
              <h3 className="feats__t display">{f.t}</h3>
              <p className="feats__b">{f.b}</p>
            </article>
          ))}
        </div>
      </section>

      {/* FEATURED WORK */}
      <section>
        <div className="section-rule">
          <span className="eyebrow">// {locale === "es" ? "TRABAJOS DESTACADOS" : "FEATURED WORK"}</span>
          <span className="line" />
          <button type="button" className="btn" onClick={() => go("projects")}>
            {locale === "es" ? "Todos los proyectos" : "All projects"} <span className="arrow">→</span>
          </button>
        </div>
        <div>
          {featured.map((p, i) => (
            <ProjectRow key={p.slug} project={p} idx={i + 1} locale={locale} go={go} />
          ))}
        </div>
      </section>
    </div>
  );
}
