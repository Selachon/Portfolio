import { CONTENT } from "../content/site.js";
import { useNav } from "../app/useNav.js";
import { waHref } from "../app/whatsapp.js";
import StatusTicker from "../components/ui/StatusTicker.jsx";
import ProjectRow from "../components/ui/ProjectRow.jsx";

export default function Home({ locale }) {
  const c = CONTENT.home[locale] ?? CONTENT.home.es;
  const contact = CONTENT.contact[locale] ?? CONTENT.contact.es;
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
          <span className="mono-uppr" style={{ color: "var(--ink-3)" }}>v2026.07</span>
        </div>

        <h1 className="hero__title display">
          {c.titleLine1} <em className="ital">{c.titleItalic}</em>{c.titleLine2}
        </h1>

        <div className="hero__split">
          <div>
            <p className="hero__sub">{c.sub}</p>
            <div className="hero__ctas">
              <a className="btn btn--solid" href={waHref(contact.whatsappPrefill)} target="_blank" rel="noopener noreferrer">
                {c.ctaPrimary} <span className="arrow">→</span>
              </a>
              <button type="button" className="btn" onClick={() => go("projects")}>
                {c.ctaSecondary} <span className="arrow">→</span>
              </button>
            </div>

            <div className="note" style={{ marginTop: 28 }}>{c.footnoteHero}</div>
          </div>

          <StatusTicker items={c.ticker} label={c.statusLabel} footer={c.statusFooter} badge={c.statusBadge} />
        </div>
      </section>

      {/* STATS — delivery + price anchors */}
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

      {/* SERVICES — the two Motor 1 offers */}
      <section>
        <div className="section-rule">
          <span className="eyebrow">{c.servicesEyebrow}</span>
          <span className="line" />
          <span className="eyebrow">02 / OFERTAS</span>
        </div>
        <h2 className="page__title" style={{ marginBottom: 24 }}>{c.servicesTitle}</h2>
        <div className="feats feats--2">
          {c.services.map((s) => (
            <article key={s.idx}>
              <div className="feats__idx">
                <span className="accent">[ {s.idx} ]</span>
                <span>{s.tag}</span>
              </div>
              <h3 className="feats__t display">{s.t}</h3>
              <p className="feats__b">{s.b}</p>
              <ul className="bullets" style={{ marginTop: 18 }}>
                {s.bullets.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* WHY FAST WORKS */}
      <section>
        <div className="section-rule">
          <span className="eyebrow">{c.whyEyebrow}</span>
          <span className="line" />
          <span className="eyebrow">03 / ITEMS</span>
        </div>
        <h2 className="page__title" style={{ marginBottom: 24 }}>{c.whyTitle}</h2>
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

      {/* PROOF */}
      <section>
        <div className="section-rule">
          <span className="eyebrow">{c.proofEyebrow}</span>
          <span className="line" />
          <button type="button" className="btn" onClick={() => go("projects")}>
            {locale === "es" ? "Todos los casos" : "All cases"} <span className="arrow">→</span>
          </button>
        </div>
        <div>
          {featured.map((p, i) => (
            <ProjectRow key={p.slug} project={p} idx={i + 1} locale={locale} go={go} />
          ))}
        </div>
      </section>

      {/* CLOSING CTA */}
      <section
        className="panel"
        style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center", justifyContent: "space-between" }}
      >
        <span className="panel__corner tl" /><span className="panel__corner tr" />
        <span className="panel__corner bl" /><span className="panel__corner br" />
        <div style={{ maxWidth: "48ch" }}>
          <div className="display" style={{ fontSize: "clamp(22px, 2.6vw, 32px)" }}>{c.closingTitle}</div>
          <p style={{ color: "var(--ink-2)", marginTop: 8 }}>{c.closingText}</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="btn btn--lg btn--solid" href={waHref(contact.whatsappPrefill)} target="_blank" rel="noopener noreferrer">
            {c.closingCta} <span className="arrow">↗</span>
          </a>
          <button type="button" className="btn btn--lg" onClick={() => go("contact")}>
            {locale === "es" ? "Otros canales" : "Other channels"} <span className="arrow">→</span>
          </button>
        </div>
      </section>
    </div>
  );
}
