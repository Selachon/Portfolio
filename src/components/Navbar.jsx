import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import koraLogo from "../assets/brand/kora-logo.png";
import { getLocalizedPath, getPath } from "../app/paths.js";
import { CONTENT } from "../content/site.js";

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export default function Navbar({ theme, setTheme, locale, setLocale }) {
  const navigate = useNavigate();
  const location = useLocation();
  const labels = CONTENT.nav[locale] ?? CONTENT.nav.es;

  const items = [
    { key: "home", label: "Home" },
    { key: "projects", label: labels.projects },
    { key: "about", label: labels.about },
    { key: "demos", label: labels.demos },
    { key: "contact", label: labels.contact },
  ];

  const homePath = getPath("home", locale);
  const isActive = (key) => {
    const path = getPath(key, locale);
    if (key === "home") return location.pathname === homePath;
    return location.pathname.startsWith(path);
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

      if (isTypingContext(event.target)) return;

      if ((key === "t" || key === "l") && event.repeat) return;

      if (key === "t") setTheme((value) => (value === "dark" ? "light" : "dark"));
      if (key === "l") toggleLocale();
      if (event.key === "Escape") navigate(getPath("home", locale));
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locale, navigate, setTheme, toggleLocale]);

  const go = (key) => (event) => {
    event.preventDefault();
    navigate(getPath(key, locale));
  };

  return (
    <div className="container">
      <nav className="nav">
        <a href={homePath} onClick={go("home")} className="nav__brand" aria-label="Kora by Sela">
          <img src={koraLogo} alt="Kora by Sela" className="nav__logo" />
        </a>

        <div className="nav__links">
          {items.map((it) => (
            <a
              key={it.key}
              href={getPath(it.key, locale)}
              onClick={go(it.key)}
              className={"nav__link" + (isActive(it.key) ? " is-active" : "")}
            >
              {it.label}
            </a>
          ))}
        </div>

        <div className="nav__util">
          <button
            type="button"
            className="iconbtn"
            onClick={toggleLocale}
            aria-label="Toggle language"
            title={locale === "es" ? "Cambiar idioma (L)" : "Switch language (L)"}
          >
            {locale === "es" ? "EN" : "ES"}
          </button>
          <button
            type="button"
            className="iconbtn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
            title="Toggle theme (T)"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </nav>
    </div>
  );
}
