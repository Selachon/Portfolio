// Supported interface languages for the portfolio.
export const SUPPORTED_LOCALES = ["es", "en"];

// Explicit locale mapping for language-specific routes.
export const LOCALE_BY_PATH = {
  "/proyectos": "es",
  "/sobre-mi": "es",
  "/contacto": "es",
  "/caso/fares": "es",
  "/projects": "en",
  "/about": "en",
  "/contact": "en",
  "/case/fares": "en",
};

// Transition durations kept as constants to tune animation timing in one place.
export const PORTAL_DURATION_MS = 1120;
export const REDUCED_MOTION_PORTAL_DURATION_MS = 180;
