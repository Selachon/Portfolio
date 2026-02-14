import PageShell from "../components/PageShell.jsx";
import ProjectCard from "../components/ProjectCard.jsx";
import { getLocalizedProjects } from "../data/projects.js";

const PROJECTS_COPY = {
  es: {
    title: "Proyectos",
    subtitle:
      "Casos reales y laboratorio técnico. En Kora priorizo calidad operativa y contexto de negocio, no volumen sin sentido.",
    featured: "Destacados",
    lab: "Laboratorio",
    labText:
      "Proyectos para experimentar, validar ideas y mejorar procesos. No son marketing: son práctica real aplicada a desarrollo y automatización.",
  },
  en: {
    title: "Projects",
    subtitle:
      "Real cases plus technical lab work. At Kora, I prioritize operational quality and business context over empty project quantity.",
    featured: "Featured",
    lab: "Lab",
    labText:
      "Projects used to experiment, validate ideas, and improve workflows. These are not portfolio fillers, but real technical practice.",
  },
};

export default function Projects({ locale }) {
  const copy = PROJECTS_COPY[locale] ?? PROJECTS_COPY.es;
  const projects = getLocalizedProjects(locale);
  const featured = projects.filter((p) => p.featured);
  const lab = projects.filter((p) => !p.featured);

  return (
    <PageShell title={copy.title} subtitle={copy.subtitle}>
      <div className="card" style={{ padding: 18 }}>
        <div style={{ fontWeight: 760 }}>{copy.featured}</div>
        <div style={{ height: 10 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 14 }}>
          {featured.map((p) => (
            <div key={p.slug} style={{ gridColumn: "span 12" }}>
              <ProjectCard project={p} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div className="card" style={{ padding: 18 }}>
        <div style={{ fontWeight: 760 }}>{copy.lab}</div>
        <div style={{ color: "var(--muted)", marginTop: 6, lineHeight: 1.7 }}>
          {copy.labText}
        </div>

        <div style={{ height: 10 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 14 }}>
          {lab.map((p) => (
            <div key={p.slug} style={{ gridColumn: "span 12" }}>
              <ProjectCard project={p} />
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
