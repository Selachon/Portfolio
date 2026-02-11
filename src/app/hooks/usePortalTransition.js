import { useEffect, useRef, useState } from "react";
import { PORTAL_DURATION_MS, REDUCED_MOTION_PORTAL_DURATION_MS } from "../constants.js";
import { isDemoPath } from "../paths.js";

const INITIAL_PORTAL_STATE = {
  active: false,
  direction: "enter",
  key: 0,
};

// Manages portal overlay lifecycle for transitions between normal pages and demo pages.
export function usePortalTransition(pathname, prefersReducedMotion) {
  const [portalFx, setPortalFx] = useState(INITIAL_PORTAL_STATE);
  const [previousPath, setPreviousPath] = useState(pathname);
  const previousPathRef = useRef(pathname);
  const timerRef = useRef({ show: null, hide: null });
  const sequenceRef = useRef(0);

  useEffect(() => {
    const timers = timerRef.current;
    const previous = previousPathRef.current;
    const current = pathname;

    if (previous !== current) {
      setPreviousPath(previous);
    }

    previousPathRef.current = current;

    if (previous === current) return;

    const wasDemo = isDemoPath(previous);
    const nowDemo = isDemoPath(current);

    if (wasDemo === nowDemo) return;

    if (timers.show) window.clearTimeout(timers.show);
    if (timers.hide) window.clearTimeout(timers.hide);

    sequenceRef.current += 1;
    const sequence = sequenceRef.current;
    const direction = nowDemo ? "enter" : "exit";
    const duration = prefersReducedMotion ? REDUCED_MOTION_PORTAL_DURATION_MS : PORTAL_DURATION_MS;

    setPortalFx({ active: false, direction, key: sequence });

    timers.show = window.setTimeout(() => {
      if (sequenceRef.current !== sequence) return;
      setPortalFx({ active: true, direction, key: sequence });
    }, 0);

    timers.hide = window.setTimeout(() => {
      if (sequenceRef.current !== sequence) return;
      setPortalFx((currentState) =>
        currentState.key === sequence ? { ...currentState, active: false } : currentState,
      );
    }, duration);

    return () => {
      if (timers.show) window.clearTimeout(timers.show);
      if (timers.hide) window.clearTimeout(timers.hide);
    };
  }, [pathname, prefersReducedMotion]);

  useEffect(() => {
    const timers = timerRef.current;

    return () => {
      if (timers.show) window.clearTimeout(timers.show);
      if (timers.hide) window.clearTimeout(timers.hide);
    };
  }, []);

  return {
    portalFx,
    previousPath,
  };
}
