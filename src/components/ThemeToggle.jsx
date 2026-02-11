import { Moon, Sun } from "lucide-react";

const TOGGLE_COPY = {
  es: {
    label: "Cambiar tema",
  },
  en: {
    label: "Switch theme",
  },
};

export default function ThemeToggle({ theme, setTheme, locale }) {
  const isDark = theme === "dark";
  const copy = TOGGLE_COPY[locale] ?? TOGGLE_COPY.es;

  return (
    <button
      className="btn btn-ghost"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={copy.label}
      title={`${copy.label} (T)`}
      style={{
        width: 42,
        height: 42,
        minWidth: 42,
        padding: 0,
        borderRadius: 999,
      }}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
