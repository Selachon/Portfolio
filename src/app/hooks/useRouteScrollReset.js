import { useEffect } from "react";

// Route changes reset scroll position; demo area uses instant reset to avoid transition jitter.
export function useRouteScrollReset(pathname, isDemoSection) {
  useEffect(() => {
    const behavior = isDemoSection ? "auto" : "smooth";
    window.scrollTo({ top: 0, behavior });
  }, [pathname, isDemoSection]);
}
