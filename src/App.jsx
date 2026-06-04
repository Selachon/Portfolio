import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import AppRoutes from "./app/routes/AppRoutes.jsx";
import { useLocaleState } from "./app/hooks/useLocaleState.js";
import { useThemeState } from "./app/hooks/useThemeState.js";
import { useTweaks } from "./app/hooks/useTweaks.js";
import OpsBackground from "./components/background/OpsBackground.jsx";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import TweaksPanel from "./components/TweaksPanel.jsx";

export default function App() {
  const location = useLocation();
  const [theme, setTheme] = useThemeState();
  const [locale, setLocale] = useLocaleState();
  const [tweaks, setTweak] = useTweaks(theme);

  // Reset scroll on route change (instant, matching the operations console feel).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <>
      <OpsBackground />
      <div className="shell">
        <Navbar theme={theme} setTheme={setTheme} locale={locale} setLocale={setLocale} />

        <main key={location.pathname} className="container">
          <AppRoutes locale={locale} location={location} />
        </main>

        <Footer locale={locale} />
      </div>

      <TweaksPanel tweaks={tweaks} setTweak={setTweak} />
    </>
  );
}
