import { CONTENT } from "../content/site.js";
import { useNav } from "../app/useNav.js";
import PageHead from "../components/ui/PageHead.jsx";

export default function Contact({ locale }) {
  const c = CONTENT.contact[locale] ?? CONTENT.contact.es;
  const info = CONTENT.contact.info;
  const go = useNav(locale);
  const waHref = `${info.whatsapp}?text=${encodeURIComponent(c.whatsappPrefill)}`;

  return (
    <div className="page fade-in">
      <PageHead eyebrow={c.eyebrow} title={c.title} sub={c.sub} />

      <section>
        <div className="contact-grid">
          <div>
            <div className="contact-k">{c.labels.email}</div>
            <div className="contact-v"><a href={`mailto:${info.email}`}>{info.email}</a></div>
          </div>
          <div>
            <div className="contact-k">{c.labels.response}</div>
            <div className="contact-v">{c.values.response}</div>
          </div>
          <div>
            <div className="contact-k">{c.labels.scope}</div>
            <div className="contact-v">{c.values.scope}</div>
          </div>
          <div>
            <div className="contact-k">{c.labels.availability}</div>
            <div className="contact-v"><span style={{ color: "var(--accent)" }}>●</span> {c.values.availability}</div>
          </div>
          <div>
            <div className="contact-k">{c.labels.linkedin}</div>
            <div className="contact-v"><a href={info.linkedin} target="_blank" rel="noopener noreferrer">josep99 ↗</a></div>
          </div>
          <div>
            <div className="contact-k">{c.labels.whatsapp}</div>
            <div className="contact-v"><a href={waHref} target="_blank" rel="noopener noreferrer">{info.whatsappDisplay} ↗</a></div>
          </div>
        </div>
      </section>

      <section style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <a className="btn btn--lg btn--solid" href={`mailto:${info.email}`}>{c.cta} <span className="arrow">→</span></a>
        <a className="btn btn--lg" href={waHref} target="_blank" rel="noopener noreferrer">{c.ctaWa} <span className="arrow">↗</span></a>
        <button type="button" className="btn btn--lg" onClick={() => go("projects")}>
          {locale === "es" ? "Ver proyectos" : "View projects"} <span className="arrow">→</span>
        </button>
      </section>

      <section>
        <div className="section-rule">
          <span className="eyebrow">// CHANNEL · DEBUG</span>
          <span className="line" />
          <span className="eyebrow">ALL · OPEN</span>
        </div>
        <div className="note" style={{ fontFamily: "var(--f-mono)", padding: "12px 0", lineHeight: 1.9 }}>
          <div><span className="arr">›</span> protocol: smtp · status: <span style={{ color: "var(--accent)" }}>ok</span></div>
          <div><span className="arr">›</span> protocol: whatsapp · status: <span style={{ color: "var(--accent)" }}>ok</span></div>
          <div><span className="arr">›</span> protocol: linkedin · status: <span style={{ color: "var(--accent)" }}>ok</span></div>
          <div><span className="arr">›</span> operator: SELA · tz: america/bogota · ack&lt;24h</div>
        </div>
      </section>
    </div>
  );
}
