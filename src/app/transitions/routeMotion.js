// Returns motion props used by the main route container.
// Keeping this pure function isolated makes future transition tweaks safer.
export function getRouteMotionConfig({
  prefersReducedMotion,
  isDemoSection,
  isCrossingDemoBoundary,
  isDemoToDemo,
}) {
  const initial = prefersReducedMotion
    ? { opacity: 0 }
    : isDemoSection
      ? isCrossingDemoBoundary
        ? {
            opacity: 1,
            clipPath: "circle(10% at 50% 50%)",
            filter: "blur(10px) saturate(1.08)",
          }
        : {
            opacity: 0.92,
            y: 6,
            scale: 0.998,
            filter: "blur(2px) saturate(1.05)",
          }
      : { opacity: 0, y: 18, scale: 0.996 };

  const animate = prefersReducedMotion
    ? { opacity: 1 }
    : isDemoSection
      ? isCrossingDemoBoundary
        ? {
            opacity: 1,
            clipPath: "circle(150% at 50% 50%)",
            filter: "blur(0px) saturate(1)",
          }
        : {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: "blur(0px) saturate(1)",
          }
      : { opacity: 1, y: 0, scale: 1 };

  const exit = prefersReducedMotion
    ? { opacity: 0 }
    : isDemoSection
      ? isCrossingDemoBoundary
        ? {
            opacity: 1,
            clipPath: "circle(10% at 50% 50%)",
            filter: "blur(8px) saturate(1.08)",
          }
        : {
            opacity: 0.92,
            y: -6,
            scale: 0.998,
            filter: "blur(2px) saturate(1.05)",
          }
      : { opacity: 0, y: -12, scale: 0.996 };

  const transition = prefersReducedMotion
    ? { duration: 0.15 }
    : {
        duration: isDemoSection ? (isCrossingDemoBoundary ? 0.8 : isDemoToDemo ? 0.3 : 0.24) : 0.34,
        ease: [0.22, 1, 0.36, 1],
      };

  return { initial, animate, exit, transition };
}
