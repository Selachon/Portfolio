const DEMO_BRANDS = {
  hub: {
    es: {
      label: "Kora Demo Nexus",
      tagline: "Muestras interactivas de producto bajo Kora by Sela",
    },
    en: {
      label: "Kora Demo Nexus",
      tagline: "Interactive product showcases under Kora by Sela",
    },
  },
  blog: {
    es: {
      label: "Kora Editorial Lab",
      tagline: "Demo CMS con estética de publicación real",
    },
    en: {
      label: "Kora Editorial Lab",
      tagline: "CMS demo with real publishing aesthetics",
    },
  },
  auth: {
    es: {
      label: "Kora Access Vault",
      tagline: "Flujos de autenticación y sesión con enfoque de seguridad",
    },
    en: {
      label: "Kora Access Vault",
      tagline: "Authentication and session flows with a security-first focus",
    },
  },
  automation: {
    es: {
      label: "Kora Flow Command",
      tagline: "Orquestación B2B con trazabilidad y ejecución por eventos",
    },
    en: {
      label: "Kora Flow Command",
      tagline: "B2B orchestration with traceability and event-driven execution",
    },
  },
};

export default function DemoLayout({ locale, title, subtitle, right, children, theme = "hub" }) {
  const brandPack = DEMO_BRANDS[theme] ?? DEMO_BRANDS.hub;
  const brand = brandPack[locale] ?? brandPack.es;

  return (
    <main className={`demo-page demo-theme-${theme}`}>
      <section className={`demo-scope demo-theme-${theme}`}>
        <div className="demo-page__inner">
          <div className="demo-brandbar">
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className={`demo-brandmark demo-brandmark--${theme}`} aria-hidden="true" />
              <div>
                <p className="demo-brandbar__eyebrow">Kora by Sela</p>
                <p className="demo-brandbar__title">{brand.label}</p>
              </div>
            </div>
            <p className="demo-brandbar__tagline">{brand.tagline}</p>
          </div>

          <div style={{ padding: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "clamp(2rem, 4vw, 2.35rem)",
                    lineHeight: 1.1,
                    letterSpacing: -0.8,
                  }}
                >
                  {title}
                </h1>
                {subtitle ? (
                  <p style={{ margin: "10px 0 0", color: "var(--muted)", maxWidth: 820, lineHeight: 1.65 }}>
                    {subtitle}
                  </p>
                ) : null}
              </div>

              {right ? <div>{right}</div> : null}
            </div>

            <div style={{ height: 14 }} />

            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
