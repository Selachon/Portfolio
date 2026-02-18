export function Block({ title, children }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ fontWeight: 800, letterSpacing: -0.2 }}>{title}</div>
      <div style={{ marginTop: 8, color: "var(--muted)", lineHeight: 1.8 }}>{children}</div>
    </div>
  );
}

export function TagRow({ items }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {items.map((tag) => (
        <span
          key={tag}
          className="pill"
          style={{
            padding: "8px 10px",
            fontSize: 13,
            color: "var(--muted)",
            background: "color-mix(in srgb, var(--accent-soft) 38%, var(--bg-elev))",
            borderColor: "color-mix(in srgb, var(--accent) 18%, var(--border))",
          }}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

export function BulletList({ items }) {
  return (
    <ul style={{ margin: "10px 0 0", paddingLeft: 18, lineHeight: 1.9 }}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
