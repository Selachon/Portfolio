import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

// Componente para mostrar tarjetas de proyectos con animación y enlaces
export default function ProjectCard({ project }) {
  const { title, description, tags, links } = project;

  return (
    <div
      className="card"
      style={{ padding: 18, display: "grid", gap: 12 }}
    >
      {/* Contenido principal: título, descripción y enlaces */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 780, letterSpacing: -0.2, fontSize: 16 }}>
            {title}
          </div>
          <div
            style={{ color: "var(--muted)", marginTop: 6, lineHeight: 1.65 }}
          >
            {description}
          </div>
        </div>
        {/* Enlaces del proyecto (internos o externos) */}
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          {links?.map((l) =>
            l.href?.startsWith("/") ? (
              <Link key={l.label} className="pill" to={l.href}>
                {l.label} <ArrowUpRight size={16} />
              </Link>
            ) : (
              <a
                key={l.label}
                className="pill"
                href={l.href}
                target={l.external ? "_blank" : undefined}
                rel={l.external ? "noreferrer" : undefined}
              >
                {l.label} <ArrowUpRight size={16} />
              </a>
            ),
          )}
        </div>
      </div>

      {/* Tags/etiquetas del proyecto */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tags.map((t) => (
          <span
            key={t}
            className="pill"
            style={{
              padding: "8px 10px",
              fontSize: 13,
              color: "var(--muted)",
              background:
                "color-mix(in srgb, var(--accent-soft) 38%, var(--bg-elev))",
              borderColor:
                "color-mix(in srgb, var(--accent) 18%, var(--border))",
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
