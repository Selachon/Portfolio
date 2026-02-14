import { useEffect, useState } from "react";
import { getInitialTheme } from "../preferences.js";
import { readStorageItem, writeStorageItem } from "../storage.js";

// Theme is persisted and applied at the document root to keep CSS vars in sync.
export function useThemeState() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);

    if (readStorageItem("theme") !== theme) {
      writeStorageItem("theme", theme);
    }
  }, [theme]);

  return [theme, setTheme];
}
