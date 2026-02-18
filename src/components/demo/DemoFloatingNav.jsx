import { NavLink, useLocation } from "react-router-dom";
import { getPath, ROUTE_PATHS } from "../../app/paths.js";
import { loadDemoSession } from "../../data/demoStore.js";

const DEMO_NAV = {
  es: {
    badge: "Entorno demo interactivo",
    links: [
      { routeKey: "demos", label: "Hub" },
      { routeKey: "demoBlog", label: "Blog CMS" },
      { routeKey: "demoLogin", label: "Login" },
      { routeKey: "demoAutomation", label: "Automation Lab" },
    ],
    authDashboardLabel: "Dashboard",
  },
  en: {
    badge: "Interactive demo environment",
    links: [
      { routeKey: "demos", label: "Hub" },
      { routeKey: "demoBlog", label: "Blog CMS" },
      { routeKey: "demoLogin", label: "Login" },
      { routeKey: "demoAutomation", label: "Automation Lab" },
    ],
    authDashboardLabel: "Dashboard",
  },
};

const NAV_THEME = {
  hub: {
    light: {
      border: "rgba(92, 118, 178, 0.38)",
      bg: "rgba(242, 247, 255, 0.92)",
      badge: "#395280",
      muted: "#395280",
      strong: "#162746",
      activeBorder: "rgba(95, 111, 255, 0.8)",
      activeBg: "rgba(95, 111, 255, 0.18)",
      shadow: "0 12px 28px rgba(62, 89, 140, 0.18)",
    },
    dark: {
      border: "rgba(132, 156, 210, 0.42)",
      bg: "rgba(10, 18, 38, 0.82)",
      badge: "#d6e3ff",
      muted: "#d6e3ff",
      strong: "#ffffff",
      activeBorder: "rgba(156, 140, 255, 0.84)",
      activeBg: "rgba(156, 140, 255, 0.3)",
      shadow: "0 12px 34px rgba(3, 8, 22, 0.42)",
    },
  },
  blog: {
    light: {
      border: "rgba(97, 78, 65, 0.36)",
      bg: "rgba(255, 246, 236, 0.9)",
      badge: "#5f4a3e",
      muted: "#5f4a3e",
      strong: "#2f251f",
      activeBorder: "rgba(159, 90, 43, 0.8)",
      activeBg: "rgba(159, 90, 43, 0.2)",
      shadow: "0 12px 30px rgba(67, 43, 26, 0.2)",
    },
    dark: {
      border: "rgba(214, 167, 130, 0.36)",
      bg: "rgba(36, 26, 20, 0.9)",
      badge: "#e4cab4",
      muted: "#e4cab4",
      strong: "#fff4e8",
      activeBorder: "rgba(240, 166, 111, 0.8)",
      activeBg: "rgba(240, 166, 111, 0.22)",
      shadow: "0 12px 30px rgba(16, 11, 7, 0.42)",
    },
  },
  auth: {
    light: {
      border: "rgba(87, 120, 198, 0.4)",
      bg: "rgba(244, 248, 255, 0.93)",
      badge: "#334e7a",
      muted: "#334e7a",
      strong: "#132549",
      activeBorder: "rgba(14, 165, 160, 0.78)",
      activeBg: "rgba(14, 165, 160, 0.18)",
      shadow: "0 12px 30px rgba(56, 88, 144, 0.2)",
    },
    dark: {
      border: "rgba(94, 139, 255, 0.44)",
      bg: "rgba(8, 16, 36, 0.88)",
      badge: "#d1dbff",
      muted: "#d1dbff",
      strong: "#ffffff",
      activeBorder: "rgba(45, 212, 191, 0.85)",
      activeBg: "rgba(45, 212, 191, 0.2)",
      shadow: "0 12px 34px rgba(3, 8, 22, 0.44)",
    },
  },
  automation: {
    light: {
      border: "rgba(50, 146, 117, 0.4)",
      bg: "rgba(241, 252, 247, 0.93)",
      badge: "#2f5f4f",
      muted: "#2f5f4f",
      strong: "#12332a",
      activeBorder: "rgba(15, 159, 110, 0.8)",
      activeBg: "rgba(15, 159, 110, 0.18)",
      shadow: "0 12px 28px rgba(42, 111, 88, 0.2)",
    },
    dark: {
      border: "rgba(74, 189, 154, 0.43)",
      bg: "rgba(6, 19, 22, 0.9)",
      badge: "#c8f5df",
      muted: "#c8f5df",
      strong: "#eafff4",
      activeBorder: "rgba(52, 211, 153, 0.82)",
      activeBg: "rgba(52, 211, 153, 0.22)",
      shadow: "0 12px 34px rgba(2, 10, 8, 0.46)",
    },
  },
};

function getThemeByPath(pathname) {
  if (pathname.startsWith(ROUTE_PATHS.demoBlog.es)) return "blog";
  if (pathname.startsWith(ROUTE_PATHS.demoLogin.es) || pathname.startsWith(ROUTE_PATHS.demoDashboard.es)) return "auth";
  if (pathname.startsWith(ROUTE_PATHS.demoAutomation.es)) return "automation";
  return "hub";
}

function isLinkActive(pathname, targetPath) {
  if (targetPath === ROUTE_PATHS.demos.es) {
    return pathname === ROUTE_PATHS.demos.es;
  }

  if (targetPath === ROUTE_PATHS.demoBlog.es) {
    return pathname === ROUTE_PATHS.demoBlog.es || pathname.startsWith(`${ROUTE_PATHS.demoBlog.es}/`);
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

export default function DemoFloatingNav({ locale, visible, mode = "light" }) {
  const location = useLocation();
  const copy = DEMO_NAV[locale] ?? DEMO_NAV.es;
  const hasDemoSession = Boolean(loadDemoSession());
  const themeName = getThemeByPath(location.pathname);
  const modeName = mode === "dark" ? "dark" : "light";
  const themePack = NAV_THEME[themeName] ?? NAV_THEME.hub;
  const theme = themePack[modeName] ?? themePack.light;

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
          const isAuthLink = item.routeKey === "demoLogin";
          const baseTarget = getPath(item.routeKey, locale);
          const target = isAuthLink && hasDemoSession ? getPath("demoDashboard", locale) : baseTarget;
          const label = isAuthLink && hasDemoSession ? copy.authDashboardLabel : item.label;

          return (
            <NavLink
              key={item.routeKey}
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
