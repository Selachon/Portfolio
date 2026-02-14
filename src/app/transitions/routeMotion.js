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
        ? { opacity: 0.76 }
        : { opacity: 0.88 }
      : { opacity: 0 };

  const animate = { opacity: 1 };

  const exit = prefersReducedMotion
    ? { opacity: 0 }
    : isDemoSection
      ? isCrossingDemoBoundary
        ? { opacity: 0.64 }
        : { opacity: 0.84 }
      : { opacity: 0 };

  const transition = prefersReducedMotion
    ? { duration: 0.1 }
    : {
        duration: isDemoSection ? (isCrossingDemoBoundary ? 0.22 : isDemoToDemo ? 0.14 : 0.18) : 0.2,
        ease: [0.22, 1, 0.36, 1],
      };

  return { initial, animate, exit, transition };
}
