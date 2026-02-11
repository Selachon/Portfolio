import { NavLink, useLocation } from "react-router-dom";
import { loadDemoSession } from "../../data/demoStore.js";

const DEMO_NAV = {
  es: {
    badge: "Entorno demo interactivo",
    links: [
      { to: "/demos", label: "Hub" },
      { to: "/demos/blog", label: "Blog CMS" },
      { to: "/demos/login", label: "Login" },
      { to: "/demos/automation", label: "Automation Lab" },
    ],
    authDashboardLabel: "Dashboard",
  },
  en: {
    badge: "Interactive demo environment",
    links: [
      { to: "/demos", label: "Hub" },
      { to: "/demos/blog", label: "Blog CMS" },
      { to: "/demos/login", label: "Login" },
      { to: "/demos/automation", label: "Automation Lab" },
    ],
    authDashboardLabel: "Dashboard",
  },
};

const NAV_THEME = {
  hub: {
    border: "rgba(132, 156, 210, 0.42)",
    bg: "rgba(10, 18, 38, 0.82)",
    badge: "#d6e3ff",
    muted: "#d6e3ff",
    strong: "#ffffff",
    activeBorder: "rgba(156, 140, 255, 0.84)",
    activeBg: "rgba(156, 140, 255, 0.3)",
    shadow: "0 12px 34px rgba(3, 8, 22, 0.42)",
  },
  blog: {
    border: "rgba(97, 78, 65, 0.36)",
    bg: "rgba(255, 246, 236, 0.9)",
    badge: "#5f4a3e",
    muted: "#5f4a3e",
    strong: "#2f251f",
    activeBorder: "rgba(159, 90, 43, 0.8)",
    activeBg: "rgba(159, 90, 43, 0.2)",
    shadow: "0 12px 30px rgba(67, 43, 26, 0.2)",
  },
  auth: {
    border: "rgba(94, 139, 255, 0.44)",
    bg: "rgba(8, 16, 36, 0.88)",
    badge: "#d1dbff",
    muted: "#d1dbff",
    strong: "#ffffff",
    activeBorder: "rgba(45, 212, 191, 0.85)",
    activeBg: "rgba(45, 212, 191, 0.2)",
    shadow: "0 12px 34px rgba(3, 8, 22, 0.44)",
  },
  automation: {
    border: "rgba(74, 189, 154, 0.43)",
    bg: "rgba(6, 19, 22, 0.9)",
    badge: "#c8f5df",
    muted: "#c8f5df",
    strong: "#eafff4",
    activeBorder: "rgba(52, 211, 153, 0.82)",
    activeBg: "rgba(52, 211, 153, 0.22)",
    shadow: "0 12px 34px rgba(2, 10, 8, 0.46)",
  },
};

function getThemeByPath(pathname) {
  if (pathname.startsWith("/demos/blog")) return "blog";
  if (pathname.startsWith("/demos/login") || pathname.startsWith("/demos/dashboard")) return "auth";
  if (pathname.startsWith("/demos/automation")) return "automation";
  return "hub";
}

function isLinkActive(pathname, targetPath) {
  if (targetPath === "/demos") {
    return pathname === "/demos";
  }

  if (targetPath === "/demos/blog") {
    return pathname === "/demos/blog" || pathname.startsWith("/demos/blog/");
  }

  return pathname === targetPath;
}

function demoLinkStyle(pathname, targetPath) {
  const active = isLinkActive(pathname, targetPath);

  return {
    borderColor: active ? "var(--demo-nav-active-border)" : "var(--demo-nav-border)",
    background: active ? "var(--demo-nav-active-bg)" : "var(--demo-nav-bg)",
    color: active ? "var(--demo-nav-strong)" : "var(--demo-nav-muted)",
    opacity: active ? 1 : 0.92,
  };
}

export default function DemoFloatingNav({ locale, visible }) {
  const location = useLocation();
  const copy = DEMO_NAV[locale] ?? DEMO_NAV.es;
  const hasDemoSession = Boolean(loadDemoSession());
  const themeName = getThemeByPath(location.pathname);
  const theme = NAV_THEME[themeName] ?? NAV_THEME.hub;

  return (
    <nav
      className={`demo-floating-nav demo-floating-nav--${themeName} ${visible ? "is-visible" : "is-hidden"}`}
      aria-label={copy.badge}
      style={{
        "--demo-nav-border": theme.border,
        "--demo-nav-bg": theme.bg,
        "--demo-nav-badge": theme.badge,
        "--demo-nav-muted": theme.muted,
        "--demo-nav-strong": theme.strong,
        "--demo-nav-active-border": theme.activeBorder,
        "--demo-nav-active-bg": theme.activeBg,
        "--demo-nav-shadow": theme.shadow,
      }}
    >
      <div className="demo-floating-nav__inner">
        <span className="demo-floating-nav__badge">
          <span className="accent">◉</span>
          <span>{copy.badge}</span>
        </span>

        {copy.links.map((item) => {
          const isAuthLink = item.to === "/demos/login";
          const target = isAuthLink && hasDemoSession ? "/demos/dashboard" : item.to;
          const label = isAuthLink && hasDemoSession ? copy.authDashboardLabel : item.label;

          return (
            <NavLink
              key={item.to}
              className="pill demo-floating-nav__link"
              to={target}
              style={demoLinkStyle(location.pathname, target)}
            >
              {label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
