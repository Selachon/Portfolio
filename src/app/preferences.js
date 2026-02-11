import { LOCALE_BY_PATH, SUPPORTED_LOCALES } from "./constants.js";

export function getInitialTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getInitialLocale() {
  const localeFromPath = LOCALE_BY_PATH[window.location?.pathname];
  if (SUPPORTED_LOCALES.includes(localeFromPath)) return localeFromPath;

  const saved = localStorage.getItem("locale");
  if (SUPPORTED_LOCALES.includes(saved)) return saved;

  const browserLocale = window.navigator?.language?.slice(0, 2).toLowerCase();
  return SUPPORTED_LOCALES.includes(browserLocale) ? browserLocale : "es";
}
