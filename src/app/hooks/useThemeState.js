import { useEffect, useState } from "react";
import { getInitialTheme } from "../preferences.js";

// Theme is persisted and applied at the document root to keep CSS vars in sync.
export function useThemeState() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);

    if (localStorage.getItem("theme") !== theme) {
      localStorage.setItem("theme", theme);
    }
  }, [theme]);

  return [theme, setTheme];
}
