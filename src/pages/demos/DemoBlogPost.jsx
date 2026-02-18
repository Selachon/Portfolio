import { Link, useParams } from "react-router-dom";
import DemoLayout from "../../components/demo/DemoLayout.jsx";
import { loadDemoPosts } from "../../data/demoStore.js";
import { getPath } from "../../app/paths.js";
import { formatLocalizedDateTime } from "../../app/dateTime.js";

const POST_COPY = {
  es: {
    subtitle: "Vista detalle de un post demo generado desde el CMS del portafolio.",
    notFound: "No se encontró ese post demo.",
    back: "Volver al blog demo",
    edited: "Última edición",
  },
  en: {
    subtitle: "Detail view for a demo post generated from the portfolio CMS.",
    notFound: "That demo post was not found.",
    back: "Back to blog demo",
    edited: "Last edited",
  },
};

export default function DemoBlogPost({ locale }) {
  const copy = POST_COPY[locale] ?? POST_COPY.es;
  const { slug } = useParams();
  const post = loadDemoPosts(locale).find((item) => item.slug === slug);

  if (!post) {
    return (
      <DemoLayout locale={locale} title="Blog CMS Demo" subtitle={copy.subtitle} theme="blog">
        <div className="card" style={{ padding: 18 }}>
          <p style={{ margin: 0, color: "var(--muted)" }}>{copy.notFound}</p>
          <div style={{ height: 12 }} />
          <Link className="btn" to={getPath("demoBlog", locale)}>
            {copy.back}
          </Link>
        </div>
      </DemoLayout>
    );
  }

  return (
    <DemoLayout
      locale={locale}
      title={post.title}
      subtitle={copy.subtitle}
      theme="blog"
      right={
        <Link className="pill" to={getPath("demoBlog", locale)}>
          {copy.back}
        </Link>
      }
    >
      <article className="card" style={{ padding: 18 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {post.tags.map((tag) => (
            <span key={`${post.id}-${tag}`} className="pill" style={{ padding: "6px 10px", fontSize: 12 }}>
              {tag}
            </span>
          ))}
        </div>

        <p style={{ margin: "12px 0 0", color: "var(--muted)", lineHeight: 1.8 }}>{post.excerpt}</p>

        <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>
          {copy.edited}: {formatLocalizedDateTime(post.updatedAt, locale)}
        </div>

        <div style={{ height: 12 }} />

        <div style={{ display: "grid", gap: 12 }}>
          {post.content.split("\n").map((paragraph, index) => (
            <p key={`${post.id}-line-${index}`} style={{ margin: 0, lineHeight: 1.9, color: "var(--text)" }}>
              {paragraph || " "}
            </p>
          ))}
        </div>
      </article>
    </DemoLayout>
  );
}
