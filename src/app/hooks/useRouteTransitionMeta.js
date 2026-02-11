import { isDemoPath } from "../paths.js";

// Derives transition/layout flags from current + previous route.
// Keeping this logic centralized avoids scattering route conditionals across App.
export function useRouteTransitionMeta(pathname, previousPath) {
  const pathChanged = previousPath !== pathname;
  const isDemoSection = isDemoPath(pathname);
  const wasDemoSection = isDemoPath(previousPath);

  const isDemoToDemo = pathChanged && wasDemoSection && isDemoSection;
  const isCrossingDemoBoundary = pathChanged && wasDemoSection !== isDemoSection;

  return {
    isDemoSection,
    wasDemoSection,
    isDemoToDemo,
    isCrossingDemoBoundary,
    isSoftDemoTransition: isDemoSection && !isCrossingDemoBoundary,
    appBottomPadding: isDemoSection ? "0px" : "clamp(96px, 12vh, 132px)",
    shouldShowDemoFloatingNav: isDemoSection || wasDemoSection,
  };
}
