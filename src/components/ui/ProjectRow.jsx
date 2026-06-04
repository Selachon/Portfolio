import { getPath } from "../../app/paths.js";

// Full-width project row — case-study link (internal) + live-site link (external).
export default function ProjectRow({ project, idx, locale, go }) {
  const title = project.title[locale] ?? project.title.es;
  const desc = project.desc[locale] ?? project.desc.es;

  return (
    <article className="proj">
      <div className="proj__num">{String(idx).padStart(2, "0")} / 00</div>
      <div className="proj__body">
        <h3 className="proj__title">{title}</h3>
        <p className="proj__desc">{desc}</p>
        <div className="proj__tags">
          {project.tags.map((t) => <span key={t} className="tag">{t}</span>)}
        </div>
      </div>
      <div className="proj__actions">
        {project.routeKey && (
          <a
            href={getPath(project.routeKey, locale)}
            onClick={(e) => { e.preventDefault(); go(project.routeKey); }}
            className="proj__link"
          >
            {locale === "es" ? "Caso de estudio" : "Case study"} <span className="arrow">→</span>
          </a>
        )}
        {project.live && (
          <a href={project.live} target="_blank" rel="noopener noreferrer" className="proj__link">
            {locale === "es" ? "Sitio en vivo" : "Live site"} <span className="arrow">↗</span>
          </a>
        )}
      </div>
    </article>
  );
}
