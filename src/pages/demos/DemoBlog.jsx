import { useEffect, useState } from "react";
import DemoReturn from "../../components/demo/DemoReturn.jsx";
import { fmtAgo } from "../../components/demo/demoUtils.js";

const STORAGE_KEY = "kora.demo.blog";

// Seed posts. In a module-level helper so the render path stays pure.
function getSeed(locale) {
  const now = Date.now();
  return [
    {
      id: "p1",
      title: locale === "es" ? "Bienvenida al taller" : "Welcome to the atelier",
      status: "published",
      body: locale === "es"
        ? "Esto es un demo de CRUD local. Los datos viven en tu navegador y persisten al recargar."
        : "This is a local CRUD demo. Data lives in your browser and persists on reload.",
      updated: now - 1000 * 60 * 60 * 24,
    },
    {
      id: "p2",
      title: locale === "es" ? "Sobre las decisiones técnicas" : "On technical decisions",
      status: "draft",
      body: locale === "es" ? "Borrador sobre decisiones de stack y arquitectura." : "Draft on stack and architecture decisions.",
      updated: now - 1000 * 60 * 30,
    },
  ];
}

/* DEMO 1 · BLOG CMS — skin "Atelier" (editorial paper) */
export default function DemoBlog({ locale }) {
  const [posts, setPosts] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : getSeed(locale);
    } catch {
      return getSeed(locale);
    }
  });
  const [selectedId, setSelectedId] = useState(() => posts[0]?.id || null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(posts)); } catch { /* ignore */ }
  }, [posts]);

  const selected = posts.find((p) => p.id === selectedId);
  const filtered = filter === "all" ? posts : posts.filter((p) => p.status === filter);
  const update = (patch) => {
    if (selected) setPosts((arr) => arr.map((p) => (p.id === selected.id ? { ...p, ...patch, updated: Date.now() } : p)));
  };
  const add = () => {
    const id = "p" + Math.random().toString(36).slice(2, 7);
    setPosts([{ id, title: locale === "es" ? "Borrador sin título" : "Untitled draft", status: "draft", body: "", updated: Date.now() }, ...posts]);
    setSelectedId(id);
  };
  const remove = (id) => {
    setPosts((arr) => arr.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(posts[0]?.id || null);
  };
  const fLabel = {
    all: locale === "es" ? "Todos" : "All",
    published: locale === "es" ? "Publicados" : "Published",
    draft: locale === "es" ? "Borradores" : "Drafts",
  };

  return (
    <div className="page-demo fade-in">
      <DemoReturn locale={locale} n="01" name="BLOG CMS" styleName="Atelier — editorial" />
      <div className="skin-atelier">
        <div className="at-masthead">
          <div>
            <div className="at-kicker">The Atelier Review</div>
            <h1 className="at-title">Editorial Desk</h1>
          </div>
          <div className="at-issue">No. {String(posts.length).padStart(2, "0")}<br />MMXXVI</div>
        </div>

        <div className="at-grid">
          <aside className="at-index">
            <div className="at-index__head">
              <h4>{locale === "es" ? "Índice" : "Contents"}</h4>
              <button className="at-newbtn" onClick={add}>+ {locale === "es" ? "Nuevo" : "New"}</button>
            </div>
            <div className="at-filters">
              {["all", "published", "draft"].map((f) => (
                <button key={f} className={"at-filter" + (filter === f ? " is-on" : "")} onClick={() => setFilter(f)}>{fLabel[f]}</button>
              ))}
            </div>
            {filtered.map((p, i) => (
              <div key={p.id} className={"at-entry" + (selectedId === p.id ? " is-sel" : "")} onClick={() => setSelectedId(p.id)}>
                <span className="at-entry__n">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <div className="at-entry__t">{p.title}</div>
                  <div className="at-entry__meta">
                    {p.status === "published" ? (locale === "es" ? "Publicado" : "Published") : (locale === "es" ? "Borrador" : "Draft")} · {fmtAgo(p.updated, locale)}
                  </div>
                </div>
                <button className="at-entry__x" onClick={(e) => { e.stopPropagation(); remove(p.id); }} aria-label="Delete">×</button>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="at-entry__meta" style={{ paddingTop: 14 }}>{locale === "es" ? "Sin entradas." : "No entries."}</div>
            )}
          </aside>

          <section className="at-editor">
            {selected ? (
              <>
                <div className="at-editor__bar">
                  <span className="at-byline">{locale === "es" ? "por" : "by"} Sela · {fmtAgo(selected.updated, locale)}</span>
                  <button
                    className={"at-pubtoggle" + (selected.status === "published" ? " is-pub" : "")}
                    onClick={() => update({ status: selected.status === "published" ? "draft" : "published" })}
                  >
                    {selected.status === "published" ? (locale === "es" ? "Publicado" : "Published") : (locale === "es" ? "Publicar" : "Publish")}
                  </button>
                </div>
                <input
                  className="at-titlefield"
                  value={selected.title}
                  onChange={(e) => update({ title: e.target.value })}
                  placeholder={locale === "es" ? "Título del artículo" : "Article title"}
                />
                <div className="at-rule-orn"><span className="ln" /><span className="dot">✦</span><span className="ln" /></div>
                <textarea
                  className="at-bodyfield"
                  value={selected.body}
                  onChange={(e) => update({ body: e.target.value })}
                  placeholder={locale === "es" ? "Comienza a escribir tu historia…" : "Begin writing your story…"}
                />
                <div className="at-foot">{locale === "es" ? "Guardado automáticamente · almacenamiento local" : "Auto-saved · local storage"}</div>
              </>
            ) : (
              <div className="at-byline">{locale === "es" ? "Selecciona una entrada del índice." : "Select an entry from the contents."}</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
