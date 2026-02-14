import { SUPPORTED_LOCALES } from "./constants.js";
import { LOCALE_BY_PATH } from "./paths.js";
import { readStorageItem } from "./storage.js";

function getBrowserPrefersDark() {
  if (typeof window === "undefined") return false;

  try {
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  } catch {
    return false;
  }
}

export function getInitialTheme() {
  const saved = readStorageItem("theme");
  if (saved === "light" || saved === "dark") return saved;

  return getBrowserPrefersDark() ? "dark" : "light";
}

export function getInitialLocale() {
  const pathname = typeof window !== "undefined" ? window.location?.pathname : "";
  const localeFromPath = LOCALE_BY_PATH[pathname];
  if (SUPPORTED_LOCALES.includes(localeFromPath)) return localeFromPath;

  const saved = readStorageItem("locale");
  if (SUPPORTED_LOCALES.includes(saved)) return saved;

  const browserLocale = typeof window !== "undefined" ? window.navigator?.language?.slice(0, 2).toLowerCase() : "";
  return SUPPORTED_LOCALES.includes(browserLocale) ? browserLocale : "es";
}
