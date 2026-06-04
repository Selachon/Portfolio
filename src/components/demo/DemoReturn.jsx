import { useNav } from "../../app/useNav.js";

// Shared return chrome (kept in Kora language for context) above each demo skin.
export default function DemoReturn({ locale, n, name, styleName }) {
  const go = useNav(locale);
  return (
    <div className="demo-return">
      <a
        href="#"
        onClick={(e) => { e.preventDefault(); go("demos"); }}
      >
        ← {locale === "es" ? "Volver a demos" : "Back to demos"}
      </a>
      <span>
        <span className="demo-return__tag">DEMO/{n} · {name}</span>
      </span>
      <span className="demo-return__style">{locale === "es" ? "Estilo" : "Style"} · {styleName}</span>
    </div>
  );
}
