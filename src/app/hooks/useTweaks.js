import { useEffect, useState } from "react";
import { readStorageItem, writeStorageItem } from "../storage.js";

/* ──────────────────────────────────────────────
   PALETTES — Kora-faithful. Each carries a dark + light
   variant so accent text stays legible on both themes.
   ────────────────────────────────────────────── */
export const PALETTES = [
  {
    id: "kora", name: "Kora",
    dark: { accent: "#FFB3D9", rgb: "255, 179, 217", accent2: "#C4B5FD", ink: "#131C2B" },
    light: { accent: "#E0589F", rgb: "224, 88, 159", accent2: "#8B5CF6", ink: "#FFFFFF" },
  },
  {
    id: "lavanda", name: "Lavanda",
    dark: { accent: "#C4B5FD", rgb: "196, 181, 253", accent2: "#FFB3D9", ink: "#131C2B" },
    light: { accent: "#7C3AED", rgb: "124, 58, 237", accent2: "#E0589F", ink: "#FFFFFF" },
  },
  {
    id: "menta", name: "Menta",
    dark: { accent: "#5BD6B0", rgb: "91, 214, 176", accent2: "#C4B5FD", ink: "#0B1714" },
    light: { accent: "#0E9F7A", rgb: "14, 159, 122", accent2: "#8B5CF6", ink: "#FFFFFF" },
  },
];

const TWEAK_DEFAULTS = { palette: "kora", displayFont: "serif", density: "normal" };
const STORAGE_KEY = "kora.tweaks";

function readInitial() {
  try {
    const raw = readStorageItem(STORAGE_KEY);
    return raw ? { ...TWEAK_DEFAULTS, ...JSON.parse(raw) } : TWEAK_DEFAULTS;
  } catch {
    return TWEAK_DEFAULTS;
  }
}

// Live tweaks: accent palette, display font family and layout density.
// Persisted to localStorage and applied to <html> as data attrs + CSS vars,
// so the change is global and survives reloads.
export function useTweaks(theme) {
  const [tweaks, setTweaks] = useState(readInitial);

  const setTweak = (key, value) => setTweaks((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    writeStorageItem(STORAGE_KEY, JSON.stringify(tweaks));
  }, [tweaks]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.displayfont = tweaks.displayFont;
    root.dataset.density = tweaks.density;

    const palette = PALETTES.find((p) => p.id === tweaks.palette) || PALETTES[0];
    const v = theme === "light" ? palette.light : palette.dark;
    root.style.setProperty("--accent", v.accent);
    root.style.setProperty("--accent-rgb", v.rgb);
    root.style.setProperty("--accent-2", v.accent2);
    root.style.setProperty("--accent-ink", v.ink);
    root.style.setProperty("--accent-soft", `rgba(${v.rgb}, 0.16)`);
  }, [tweaks, theme]);

  return [tweaks, setTweak];
}
