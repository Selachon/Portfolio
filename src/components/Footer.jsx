const FOOTER_COPY = {
  es: "Construido con React + Vite. Rosado en la identidad, sólido en ingeniería.",
  en: "Built with React + Vite. Pink in the identity, solid in engineering.",
};

export default function Footer({ locale }) {
  const line = FOOTER_COPY[locale] ?? FOOTER_COPY.es;

  return (
    <footer
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        borderTop: "1px solid var(--border)",
        background: "color-mix(in srgb, var(--bg) 82%, transparent)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          maxWidth: "var(--max)",
          margin: "0 auto",
          padding: "14px 18px",
          color: "var(--muted)",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          lineHeight: 1.4,
          fontSize: 13,
        }}
      >
        <span>© {new Date().getFullYear()} KORA by Sela</span>
        <span>{line}</span>
      </div>
    </footer>
  );
}
