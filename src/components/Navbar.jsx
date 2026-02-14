import { useCallback, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle.jsx";
import koraLogo from "../assets/brand/kora-logo.png";
import { getLocalizedPath, getPath } from "../app/paths.js";

const linkStyle = ({ isActive }) => ({
  textDecoration: "none",
  opacity: isActive ? 1 : 0.92,
  borderColor: isActive ? "color-mix(in srgb, var(--accent) 55%, var(--border))" : "var(--border)",
  background: isActive
    ? "color-mix(in srgb, var(--accent-soft) 45%, var(--bg-elev))"
    : "color-mix(in srgb, var(--bg-elev) 92%, transparent)",
});

const NAV_COPY = {
  es: {
    demos: "Demos",
    projects: "Proyectos",
    about: "Sobre mí",
    contact: "Contacto",
    switchLanguage: "EN",
    switchLanguageLabel: "Cambiar idioma (L)",
  },
  en: {
    demos: "Demos",
    projects: "Projects",
    about: "About",
    contact: "Contact",
    switchLanguage: "ES",
    switchLanguageLabel: "Switch language (L)",
  },
};

export default function Navbar({ theme, setTheme, locale, setLocale }) {
  const navigate = useNavigate();
  const location = useLocation();
  const copy = NAV_COPY[locale] ?? NAV_COPY.es;
  const routes = {
    demos: getPath("demos", locale),
    projects: getPath("projects", locale),
    about: getPath("about", locale),
    contact: getPath("contact", locale),
  };

  const isTypingContext = (target) => {
    if (!(target instanceof HTMLElement)) return false;

    if (target.isContentEditable) return true;

    const tag = target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;

    return Boolean(target.closest("[contenteditable='true'], [role='textbox'], input, textarea, select"));
  };

  const toggleLocale = useCallback(() => {
    const nextLocale = locale === "es" ? "en" : "es";
    const nextPathname = getLocalizedPath(location.pathname, nextLocale);

    setLocale(nextLocale);

    if (nextPathname !== location.pathname) {
      navigate(`${nextPathname}${location.search}${location.hash}`, { replace: true });
    }
  }, [locale, location.hash, location.pathname, location.search, navigate, setLocale]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key?.toLowerCase();

      if (isTypingContext(event.target)) {
        if (event.key === "Escape") return;
        return;
      }

      if ((key === "t" || key === "l") && event.repeat) return;

      if (key === "t") {
        setTheme((value) => (value === "dark" ? "light" : "dark"));
      }
      if (key === "l") {
        toggleLocale();
      }
      if (event.key === "Escape") {
        navigate(getPath("home", locale));
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locale, navigate, setTheme, toggleLocale]);

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(10px)",
        background: "color-mix(in srgb, var(--bg) 76%, transparent)",
        borderBottom: "1px solid var(--border)",
        transition: "background var(--t), border-color var(--t)",
      }}
    >
      <div
        style={{
          maxWidth: "var(--max)",
          margin: "0 auto",
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <NavLink
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            lineHeight: 1,
          }}
          aria-label="Kora by Sela"
        >
          <img
            src={koraLogo}
            alt="Kora by Sela"
            style={{
              display: "block",
              width: "auto",
              height: "clamp(56px, 9vw, 86px)",
              maxWidth: "min(88vw, 560px)",
            }}
          />
        </NavLink>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <NavLink className="pill" to={routes.projects} style={linkStyle}>
            {copy.projects}
          </NavLink>
          <NavLink className="pill" to={routes.about} style={linkStyle}>
            {copy.about}
          </NavLink>
          <NavLink className="pill" to={routes.contact} style={linkStyle}>
            {copy.contact}
          </NavLink>
          <NavLink className="pill" to={routes.demos} style={linkStyle}>
            {copy.demos}
          </NavLink>

          <button
            type="button"
            className="pill"
            onClick={toggleLocale}
            aria-label={copy.switchLanguageLabel}
            title={copy.switchLanguageLabel}
            style={{ cursor: "pointer", fontWeight: 600, minWidth: 56, justifyContent: "center" }}
          >
            {copy.switchLanguage}
          </button>

          <ThemeToggle theme={theme} setTheme={setTheme} locale={locale} />
        </div>
      </div>
    </div>
  );
}
