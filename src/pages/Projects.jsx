import { CONTENT } from "../content/site.js";
import { useNav } from "../app/useNav.js";
import PageHead from "../components/ui/PageHead.jsx";
import ProjectRow from "../components/ui/ProjectRow.jsx";

export default function Projects({ locale }) {
  const c = CONTENT.projects[locale] ?? CONTENT.projects.es;
  const go = useNav(locale);
  const items = CONTENT.items;
  const featured = items.filter((p) => p.featured);
  const lab = items.filter((p) => !p.featured);

  return (
    <div className="page fade-in">
      <PageHead eyebrow={c.eyebrow} title={c.title} sub={c.sub} />

      <section>
        <div className="section-rule">
          <span className="eyebrow">// {c.featuredLabel}</span>
          <span className="line" />
          <span className="eyebrow">
            {String(featured.length).padStart(2, "0")} {locale === "es" ? "PROYECTOS" : "PROJECTS"}
          </span>
        </div>
        <div>
          {featured.map((p, i) => (
            <ProjectRow key={p.slug} project={p} idx={i + 1} locale={locale} go={go} />
          ))}
        </div>
      </section>

      <section>
        <div className="section-rule">
          <span className="eyebrow">// {c.labLabel}</span>
          <span className="line" />
          <span className="eyebrow">
            {String(lab.length).padStart(2, "0")} {locale === "es" ? "ENTRADAS" : "ENTRIES"}
          </span>
        </div>
        <p className="page__sub" style={{ marginBottom: 8 }}>{c.labText}</p>
        <div>
          {lab.map((p, i) => (
            <ProjectRow key={p.slug} project={p} idx={featured.length + i + 1} locale={locale} go={go} />
          ))}
        </div>
      </section>
    </div>
  );
}
