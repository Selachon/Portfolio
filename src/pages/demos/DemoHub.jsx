import { CONTENT } from "../../content/site.js";
import { useNav } from "../../app/useNav.js";
import PageHead from "../../components/ui/PageHead.jsx";

export default function DemoHub({ locale }) {
  const c = CONTENT.demos[locale] ?? CONTENT.demos.es;
  const items = CONTENT.demos.items;
  const go = useNav(locale);

  return (
    <div className="page fade-in">
      <PageHead eyebrow={c.eyebrow} title={c.title} sub={c.sub} />

      <section className="demos-grid">
        {items.map((d, i) => (
          <button
            type="button"
            key={d.id}
            className="democard"
            onClick={() => go(d.routeKey)}
          >
            <div className="democard__head">
              <span className="democard__id">DEMO/{String(i + 1).padStart(2, "0")} · {d.id.toUpperCase()}</span>
              <span className="democard__status" style={{ color: d.accent }}>● {d.status}</span>
            </div>
            <h3 className="democard__t">{d.title[locale]}</h3>
            <p className="democard__d">{d.desc[locale]}</p>
            <span className="democard__cta">
              {locale === "es" ? "Abrir demo" : "Open demo"} <span className="arrow" style={{ color: d.accent }}>→</span>
            </span>
          </button>
        ))}
      </section>

      <section className="note" style={{ paddingTop: 14, borderTop: "1px solid var(--hair)" }}>
        <span className="arr">›</span> {CONTENT.demoCreds[locale]}
      </section>
    </div>
  );
}
