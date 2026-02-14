import { useEffect, useState } from "react";
import { getInitialLocale } from "../preferences.js";
import { readStorageItem, writeStorageItem } from "../storage.js";

// Locale controls visible copy and the document lang attribute for accessibility/SEO.
export function useLocaleState() {
  const [locale, setLocale] = useState(getInitialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;

    if (readStorageItem("locale") !== locale) {
      writeStorageItem("locale", locale);
    }
  }, [locale]);

  return [locale, setLocale];
}
