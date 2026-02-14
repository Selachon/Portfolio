import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getPath } from "../../app/paths.js";
import DemoLayout from "../../components/demo/DemoLayout.jsx";
import {
  createClientId,
  ensureUniqueSlug,
  loadDemoPosts,
  resetDemoPosts,
  saveDemoPosts,
  slugify,
} from "../../data/demoStore.js";

const BLOG_COPY = {
  es: {
    title: "Demo | Blog CMS",
    subtitle:
      "Editor de contenido utilizable con persistencia local. Puedes crear, editar, borrar y navegar posts como en una implementación real.",
    searchLabel: "Buscar",
    searchPlaceholder: "Buscar por título o contenido...",
    filterLabel: "Filtro",
    filterAll: "Todos",
    filterPublished: "Publicados",
    filterDraft: "Borradores",
    resetSeed: "Restablecer posts demo",
    editorTitleCreate: "Crear nuevo post",
    editorTitleEdit: "Editar post",
    fieldTitle: "Título",
    fieldExcerpt: "Resumen",
    fieldContent: "Contenido",
    fieldTags: "Tags (separados por coma)",
    fieldStatus: "Estado",
    statusDraft: "draft",
    statusPublished: "published",
    cancelEdit: "Cancelar edición",
    saveCreate: "Publicar post",
    saveEdit: "Guardar cambios",
    listTitle: "Posts demo",
    empty: "No hay posts para este filtro.",
    openPost: "Abrir",
    editPost: "Editar",
    deletePost: "Borrar",
    persistNote: "Los cambios se guardan localmente en tu navegador (localStorage).",
    validationError: "Completa al menos título y contenido.",
    createdOk: "Post creado correctamente.",
    updatedOk: "Post actualizado correctamente.",
    removedOk: "Post eliminado.",
    resetOk: "Posts demo restablecidos.",
    confirmDelete: "¿Seguro que quieres borrar este post demo?",
    updatedAt: "Actualizado",
  },
  en: {
    title: "Demo | Blog CMS",
    subtitle:
      "Usable content editor with local persistence. You can create, edit, delete, and navigate posts like a real implementation.",
    searchLabel: "Search",
    searchPlaceholder: "Search by title or content...",
    filterLabel: "Filter",
    filterAll: "All",
    filterPublished: "Published",
    filterDraft: "Drafts",
    resetSeed: "Reset demo posts",
    editorTitleCreate: "Create new post",
    editorTitleEdit: "Edit post",
    fieldTitle: "Title",
    fieldExcerpt: "Excerpt",
    fieldContent: "Content",
    fieldTags: "Tags (comma-separated)",
    fieldStatus: "Status",
    statusDraft: "draft",
    statusPublished: "published",
    cancelEdit: "Cancel edit",
    saveCreate: "Publish post",
    saveEdit: "Save changes",
    listTitle: "Demo posts",
    empty: "No posts for this filter.",
    openPost: "Open",
    editPost: "Edit",
    deletePost: "Delete",
    persistNote: "Changes are saved locally in your browser (localStorage).",
    validationError: "Please fill at least title and content.",
    createdOk: "Post created successfully.",
    updatedOk: "Post updated successfully.",
    removedOk: "Post deleted.",
    resetOk: "Demo posts reset.",
    confirmDelete: "Are you sure you want to delete this demo post?",
    updatedAt: "Updated",
  },
};

const DEFAULT_FORM = {
  title: "",
  excerpt: "",
  content: "",
  tags: "",
  status: "draft",
};

function formatDate(value, locale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function mapFormToPost(form, existing, posts, locale, id) {
  const title = form.title.trim();
  const slugBase = slugify(title);
  const slug = ensureUniqueSlug(slugBase, posts, id ?? existing?.id);
  const tags = form.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 10);

  return {
    id: id ?? existing?.id ?? createClientId(),
    slug,
    title,
    excerpt: form.excerpt.trim(),
    content: form.content.trim(),
    tags,
    status: form.status,
    author: existing?.author ?? "Kora by Sela",
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    locale,
  };
}

function postToForm(post) {
  return {
    title: post.title ?? "",
    excerpt: post.excerpt ?? "",
    content: post.content ?? "",
    tags: Array.isArray(post.tags) ? post.tags.join(", ") : "",
    status: post.status ?? "draft",
  };
}

export default function DemoBlog({ locale }) {
  const copy = BLOG_COPY[locale] ?? BLOG_COPY.es;
  const blogPath = getPath("demoBlog", locale);
  const [posts, setPosts] = useState(() => loadDemoPosts(locale));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    saveDemoPosts(posts, locale);
  }, [posts, locale]);

  const visiblePosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return posts
      .filter((post) => (filter === "all" ? true : post.status === filter))
      .filter((post) => {
        if (!normalizedQuery) return true;
        return (
          post.title.toLowerCase().includes(normalizedQuery) ||
          post.content.toLowerCase().includes(normalizedQuery) ||
          post.excerpt.toLowerCase().includes(normalizedQuery)
        );
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [posts, filter, query]);

  const clearForm = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.title.trim() || !form.content.trim()) {
      setFeedback(copy.validationError);
      return;
    }

    if (editingId) {
      setPosts((current) => {
        const existing = current.find((post) => post.id === editingId);
        const updated = mapFormToPost(form, existing, current, locale, editingId);
        return current.map((post) => (post.id === editingId ? updated : post));
      });
      clearForm();
      setFeedback(copy.updatedOk);
      return;
    }

    setPosts((current) => [mapFormToPost(form, null, current, locale), ...current]);
    clearForm();
    setFeedback(copy.createdOk);
  };

  const handleEdit = (post) => {
    setEditingId(post.id);
    setForm(postToForm(post));
    setFeedback("");
  };

  const handleDelete = (id) => {
    if (!window.confirm(copy.confirmDelete)) return;

    setPosts((current) => current.filter((post) => post.id !== id));
    if (editingId === id) {
      clearForm();
    }
    setFeedback(copy.removedOk);
  };

  const handleResetSeed = () => {
    setPosts(resetDemoPosts(locale));
    clearForm();
    setFeedback(copy.resetOk);
  };

  return (
    <DemoLayout locale={locale} title={copy.title} subtitle={copy.subtitle} theme="blog">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14, alignItems: "start" }}>
        <section className="card" style={{ padding: 18 }}>
          <h2 style={{ margin: 0, fontSize: "clamp(1.2rem, 2.7vw, 1.45rem)" }}>
            {editingId ? copy.editorTitleEdit : copy.editorTitleCreate}
          </h2>

          <form onSubmit={handleSubmit} style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>{copy.fieldTitle}</span>
              <input
                className="demo-input"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>{copy.fieldExcerpt}</span>
              <textarea
                className="demo-input"
                rows={3}
                value={form.excerpt}
                onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>{copy.fieldContent}</span>
              <textarea
                className="demo-input"
                rows={8}
                value={form.content}
                onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>{copy.fieldTags}</span>
              <input
                className="demo-input"
                value={form.tags}
                onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>{copy.fieldStatus}</span>
              <select
                className="demo-input"
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="draft">{copy.statusDraft}</option>
                <option value="published">{copy.statusPublished}</option>
              </select>
            </label>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn" type="submit">
                {editingId ? copy.saveEdit : copy.saveCreate}
              </button>
              {editingId ? (
                <button className="btn btn-ghost" type="button" onClick={clearForm}>
                  {copy.cancelEdit}
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <aside style={{ display: "grid", gap: 14 }}>
          <section className="card" style={{ padding: 16 }}>
            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>{copy.searchLabel}</span>
                <input
                  className="demo-input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={copy.searchPlaceholder}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>{copy.filterLabel}</span>
                <select className="demo-input" value={filter} onChange={(event) => setFilter(event.target.value)}>
                  <option value="all">{copy.filterAll}</option>
                  <option value="published">{copy.filterPublished}</option>
                  <option value="draft">{copy.filterDraft}</option>
                </select>
              </label>

              <div>
                <button type="button" className="btn btn-ghost" onClick={handleResetSeed}>
                  {copy.resetSeed}
                </button>
              </div>
            </div>

            {feedback ? (
              <p style={{ margin: "10px 0 0", color: "var(--muted)" }}>
                {feedback}
              </p>
            ) : null}
          </section>

          <section className="card" style={{ padding: 18 }}>
            <h2 style={{ margin: 0, fontSize: "clamp(1.2rem, 2.7vw, 1.45rem)" }}>{copy.listTitle}</h2>
            <p style={{ margin: "8px 0 0", color: "var(--muted)", lineHeight: 1.7 }}>{copy.persistNote}</p>

            <div style={{ height: 10 }} />

            {visiblePosts.length === 0 ? (
              <div className="pill" style={{ color: "var(--muted)" }}>
                {copy.empty}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {visiblePosts.map((post) => (
                  <article key={post.id} className="card" style={{ padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 760 }}>{post.title}</div>
                        <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>{post.excerpt}</p>
                      </div>
                      <span
                        className="pill"
                        style={{
                          padding: "6px 10px",
                          fontSize: 12,
                          borderColor:
                            post.status === "published"
                              ? "color-mix(in srgb, var(--success) 34%, var(--border))"
                              : "color-mix(in srgb, var(--warning) 34%, var(--border))",
                        }}
                      >
                        {post.status}
                      </span>
                    </div>

                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {post.tags.map((tag) => (
                        <span key={`${post.id}-${tag}`} className="pill" style={{ padding: "6px 10px", fontSize: 12 }}>
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 13 }}>
                      {copy.updatedAt}: {formatDate(post.updatedAt, locale)}
                    </div>

                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Link className="btn btn-ghost" to={`${blogPath}/${post.slug}`}>
                        {copy.openPost}
                      </Link>
                      <button type="button" className="btn btn-ghost" onClick={() => handleEdit(post)}>
                        {copy.editPost}
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => handleDelete(post.id)}>
                        {copy.deletePost}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </DemoLayout>
  );
}
