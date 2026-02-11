import Container from "./Container.jsx";

export default function PageShell({ title, subtitle, children, right }) {
  return (
    <main>
      <Container>
        <div style={{ paddingTop: 18 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "clamp(2rem, 4vw, 2.35rem)", lineHeight: 1.1, letterSpacing: -0.8 }}>{title}</h1>
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
          <div style={{ height: 22 }} />
        </div>
      </Container>
    </main>
  );
}
