import { useLocation } from "react-router-dom";
import { AnimatePresence, motion as Motion, useReducedMotion } from "framer-motion";
import AppRoutes from "./app/routes/AppRoutes.jsx";
import { useLocaleState } from "./app/hooks/useLocaleState.js";
import { usePortalTransition } from "./app/hooks/usePortalTransition.js";
import { useRouteScrollReset } from "./app/hooks/useRouteScrollReset.js";
import { useRouteTransitionMeta } from "./app/hooks/useRouteTransitionMeta.js";
import { useThemeState } from "./app/hooks/useThemeState.js";
import { getRouteMotionConfig } from "./app/transitions/routeMotion.js";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import PortalTransition from "./components/transitions/PortalTransition.jsx";
import DemoFloatingNav from "./components/demo/DemoFloatingNav.jsx";
import HexBackground from "./components/background/HexBackground.jsx";

export default function App() {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const [theme, setTheme] = useThemeState();
  const [locale, setLocale] = useLocaleState();

  const { portalFx, previousPath } = usePortalTransition(location.pathname, prefersReducedMotion);

  const {
    isDemoSection,
    isDemoToDemo,
    isCrossingDemoBoundary,
    isSoftDemoTransition,
    appBottomPadding,
    shouldShowDemoFloatingNav,
  } = useRouteTransitionMeta(location.pathname, previousPath);

  useRouteScrollReset(location.pathname, isDemoSection);

  const routeMotion = getRouteMotionConfig({
    prefersReducedMotion,
    isDemoSection,
    isCrossingDemoBoundary,
    isDemoToDemo,
  });

  return (
    <div style={{ minHeight: "100dvh", paddingBottom: appBottomPadding }}>
      <HexBackground />
      <Navbar theme={theme} setTheme={setTheme} locale={locale} setLocale={setLocale} />

      <AnimatePresence mode="wait" initial={false}>
        <Motion.div
          className={isSoftDemoTransition ? "demo-route-sheen" : undefined}
          key={location.pathname}
          initial={routeMotion.initial}
          animate={routeMotion.animate}
          exit={routeMotion.exit}
          transition={routeMotion.transition}
        >
          <div key={locale} className="locale-text-switch">
            <AppRoutes locale={locale} location={location} />
          </div>
        </Motion.div>
      </AnimatePresence>

      <PortalTransition
        active={portalFx.active}
        direction={portalFx.direction}
        animationKey={portalFx.key}
        reducedMotion={prefersReducedMotion}
      />

      <DemoFloatingNav locale={locale} visible={shouldShowDemoFloatingNav} />

      <Footer locale={locale} />
    </div>
  );
}
