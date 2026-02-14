import { SUPPORTED_LOCALES } from "./constants.js";

const DEFAULT_LOCALE = "es";

export const ROUTE_PATHS = Object.freeze({
  home: Object.freeze({ es: "/", en: "/" }),
  projects: Object.freeze({ es: "/proyectos", en: "/projects" }),
  about: Object.freeze({ es: "/sobre-mi", en: "/about" }),
  contact: Object.freeze({ es: "/contacto", en: "/contact" }),
  caseFares: Object.freeze({ es: "/caso/fares", en: "/case/fares" }),
  caseContaGo: Object.freeze({ es: "/caso/contago", en: "/case/contago" }),
  demos: Object.freeze({ es: "/demos", en: "/demos" }),
  demoBlog: Object.freeze({ es: "/demos/blog", en: "/demos/blog" }),
  demoBlogPost: Object.freeze({ es: "/demos/blog/:slug", en: "/demos/blog/:slug" }),
  demoLogin: Object.freeze({ es: "/demos/login", en: "/demos/login" }),
  demoDashboard: Object.freeze({ es: "/demos/dashboard", en: "/demos/dashboard" }),
  demoAutomation: Object.freeze({ es: "/demos/automation", en: "/demos/automation" }),
});

const PATH_TO_ROUTE_KEY = Object.freeze(
  Object.entries(ROUTE_PATHS).reduce((accumulator, [routeKey, localizedPaths]) => {
    SUPPORTED_LOCALES.forEach((locale) => {
      const path = localizedPaths[locale];
      if (typeof path === "string" && !path.includes(":")) {
        accumulator[path] = routeKey;
      }
    });
    return accumulator;
  }, {}),
);

export const LOCALE_BY_PATH = Object.freeze(
  Object.entries(ROUTE_PATHS).reduce((accumulator, [, localizedPaths]) => {
    const esPath = localizedPaths.es;
    const enPath = localizedPaths.en;

    if (esPath !== enPath) {
      accumulator[esPath] = "es";
      accumulator[enPath] = "en";
    }

    return accumulator;
  }, {}),
);

export function normalizeLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}

export function getPath(routeKey, locale = DEFAULT_LOCALE) {
  const localized = ROUTE_PATHS[routeKey];
  if (!localized) return ROUTE_PATHS.home.es;

  const safeLocale = normalizeLocale(locale);
  return localized[safeLocale] ?? localized[DEFAULT_LOCALE] ?? ROUTE_PATHS.home.es;
}

export function getLocalizedPath(pathname, locale = DEFAULT_LOCALE) {
  const safePath = typeof pathname === "string" && pathname.length > 0 ? pathname : ROUTE_PATHS.home.es;
  const routeKey = PATH_TO_ROUTE_KEY[safePath];

  if (!routeKey) return safePath;
  return getPath(routeKey, locale);
}

// Demo routes are grouped under /demos and share transitions/navigation behavior.
export function isDemoPath(pathname) {
  return typeof pathname === "string" && pathname.startsWith(ROUTE_PATHS.demos.es);
}
