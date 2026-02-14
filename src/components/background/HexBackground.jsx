import { useEffect, useRef } from "react";

const HEX_UNIT_POINTS = Array.from({ length: 6 }, (_, index) => {
  const angle = ((60 * index - 30) * Math.PI) / 180;
  return {
    x: Math.cos(angle),
    y: Math.sin(angle),
  };
});

function traceHex(target, cx, cy, radius) {
  for (let index = 0; index < HEX_UNIT_POINTS.length; index += 1) {
    const point = HEX_UNIT_POINTS[index];
    const x = cx + radius * point.x;
    const y = cy + radius * point.y;

    if (index === 0) {
      target.moveTo(x, y);
    } else {
      target.lineTo(x, y);
    }
  }
}

function drawHexPath(ctx, cx, cy, radius) {
  ctx.beginPath();
  traceHex(ctx, cx, cy, radius);
  ctx.closePath();
}

function appendHexPath(path, cx, cy, radius) {
  traceHex(path, cx, cy, radius);
  path.closePath();
}

function getPalette() {
  const styles = getComputedStyle(document.documentElement);

  return {
    line: styles.getPropertyValue("--hex-line").trim() || "rgba(30, 41, 59, 0.1)",
    fill: styles.getPropertyValue("--hex-fill").trim() || "rgba(255, 179, 217, 0.1)",
    activeStroke:
      styles.getPropertyValue("--hex-active-stroke").trim() || "rgba(255, 179, 217, 0.76)",
    activeGlow: styles.getPropertyValue("--hex-active-glow").trim() || "rgba(229, 222, 255, 0.5)",
  };
}

export default function HexBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!context) return undefined;

    const pointer = {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.5,
      active: false,
    };

    const activeHighlight = {
      x: pointer.x,
      y: pointer.y,
      alpha: 0,
      key: null,
    };

    const trail = [];
    const TRAIL_MAX_SEGMENTS = 24;
    let lastTrailX = activeHighlight.x;
    let lastTrailY = activeHighlight.y;
    let lastTrailKey = null;
    let lastTrailStamp = 0;

    let frame = null;
    let lastFrameTime = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let palette = getPalette();
    let gridGeometry = null;
    let gridBitmap = null;
    let reducedMotionQuery = null;
    let reduceMotionEnabled = false;
    let isVisible = !document.hidden;

    const stopAnimation = () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
        frame = null;
      }
    };

    const startAnimation = () => {
      if (reduceMotionEnabled || !isVisible || frame !== null) return;
      lastFrameTime = 0;
      frame = window.requestAnimationFrame(draw);
    };

    const renderGridBitmap = () => {
      if (!gridGeometry || width === 0 || height === 0) {
        gridBitmap = null;
        return;
      }

      const buffer = document.createElement("canvas");
      buffer.width = Math.max(1, Math.floor(width * dpr));
      buffer.height = Math.max(1, Math.floor(height * dpr));

      const bufferContext = buffer.getContext("2d", { alpha: true });
      if (!bufferContext) {
        gridBitmap = null;
        return;
      }

      bufferContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      bufferContext.clearRect(0, 0, width, height);
      bufferContext.globalAlpha = 0.82;
      bufferContext.strokeStyle = palette.line;
      bufferContext.lineWidth = 0.8;
      bufferContext.lineJoin = "round";
      bufferContext.stroke(gridGeometry.path);
      gridBitmap = buffer;
    };

    const buildGeometry = () => {
      const radius = width < 640 ? 16 : width < 1120 ? 19 : 22;
      const stepX = Math.sqrt(3) * radius;
      const stepY = radius * 1.5;
      const path = new Path2D();
      const startY = -stepY * 2;
      const rows = [];

      let row = 0;
      for (let y = startY; y < height + stepY * 2; y += stepY) {
        const offset = row % 2 === 0 ? 0 : stepX / 2;
        const startX = -stepX * 2 + offset;
        let column = 0;

        for (let x = startX; x < width + stepX * 2; x += stepX) {
          const cx = x;
          const cy = y;

          appendHexPath(path, cx, cy, radius);
          column += 1;
        }

        rows.push({ y, startX, colCount: column });

        row += 1;
      }

      gridGeometry = { radius, path, rows, stepX, stepY, startY };
      renderGridBitmap();
    };

    const findNearestCell = (x, y) => {
      if (!gridGeometry) return null;

      const { rows, stepX, stepY, startY } = gridGeometry;
      const roughRow = Math.round((y - startY) / stepY);
      let nearest = null;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (let rowIndex = roughRow - 1; rowIndex <= roughRow + 1; rowIndex += 1) {
        const row = rows[rowIndex];
        if (!row || row.colCount === 0) continue;

        const roughColumn = Math.round((x - row.startX) / stepX);

        for (let columnIndex = roughColumn - 1; columnIndex <= roughColumn + 1; columnIndex += 1) {
          if (columnIndex < 0 || columnIndex >= row.colCount) continue;

          const cellX = row.startX + columnIndex * stepX;
          const cellY = row.y;
          const dx = x - cellX;
          const dy = y - cellY;
          const distance = dx * dx + dy * dy;

          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = {
              x: cellX,
              y: cellY,
              key: rowIndex * 2048 + columnIndex,
              distance,
            };
          }
        }
      }

      return nearest;
    };

    const renderHighlight = (centerX, centerY, radius, alpha, intensity = 1) => {
      if (alpha <= 0.01) return;

      context.save();
      context.globalAlpha = Math.min(1, alpha);
      context.shadowColor = palette.activeGlow;
      context.shadowBlur = 4 + intensity * 6;
      context.fillStyle = palette.fill;
      context.strokeStyle = palette.activeStroke;
      context.lineWidth = 1.3;

      drawHexPath(context, centerX, centerY, radius);
      context.fill();
      context.stroke();
      context.restore();
    };

    const clearTrail = () => {
      trail.length = 0;
      lastTrailX = activeHighlight.x;
      lastTrailY = activeHighlight.y;
      lastTrailKey = activeHighlight.key;
      lastTrailStamp = 0;
    };

    const addTrailPoint = (x, y, key, radius, timestamp, alpha) => {
      if (alpha <= 0.18 || key === null) return;
      if (timestamp - lastTrailStamp < 14) return;

      const minDistance = Math.max(2, radius * 0.2);
      const dx = x - lastTrailX;
      const dy = y - lastTrailY;
      const distanceSq = dx * dx + dy * dy;

      if (key === lastTrailKey && distanceSq < minDistance * minDistance) {
        return;
      }

      trail.push({
        x,
        y,
        key,
        alpha: Math.min(0.62, alpha * 0.62),
        radius: radius * 0.96,
      });

      if (trail.length > TRAIL_MAX_SEGMENTS) {
        trail.splice(0, trail.length - TRAIL_MAX_SEGMENTS);
      }

      lastTrailX = x;
      lastTrailY = y;
      lastTrailKey = key;
      lastTrailStamp = timestamp;
    };

    const decayTrail = (delta, radius) => {
      if (trail.length === 0) return;

      const alphaDecay = Math.pow(0.88, delta);
      const radiusEase = 1 - Math.pow(0.92, delta);
      const trailRadiusTarget = radius * 1.18;

      for (let index = trail.length - 1; index >= 0; index -= 1) {
        const segment = trail[index];
        segment.alpha *= alphaDecay;
        segment.radius += (trailRadiusTarget - segment.radius) * radiusEase;

        if (segment.alpha < 0.008) {
          trail.splice(index, 1);
        }
      }
    };

    const renderTrail = () => {
      for (let index = 0; index < trail.length; index += 1) {
        const segment = trail[index];
        const ageRatio = (index + 1) / (trail.length + 1);
        renderHighlight(segment.x, segment.y, segment.radius, segment.alpha * ageRatio, 0.62);
      }
    };

    const drawFullGrid = () => {
      if (gridBitmap) {
        context.globalAlpha = 1;
        context.drawImage(gridBitmap, 0, 0, width, height);
        return;
      }

      if (!gridGeometry) return;

      context.globalAlpha = 0.82;
      context.strokeStyle = palette.line;
      context.lineWidth = 0.8;
      context.lineJoin = "round";
      context.stroke(gridGeometry.path);
    };

    const draw = (timestamp) => {
      const elapsedMs = lastFrameTime > 0 ? Math.min(40, timestamp - lastFrameTime) : 1000 / 60;
      const delta = elapsedMs / (1000 / 60);
      const followStrength = 1 - Math.pow(0.42, delta);
      const alphaStrength = 1 - Math.pow(0.58, delta);
      const fadeStrength = 1 - Math.pow(0.74, delta);

      lastFrameTime = timestamp;

      if (!gridGeometry) {
        return;
      }

      const { radius } = gridGeometry;
      const centerX = width * 0.5;
      const centerY = height * 0.5;

      let driftX = 0;
      let driftY = 0;
      let rotation = 0;
      let cosR = 1;
      let sinR = 0;

      if (!reduceMotionEnabled) {
        const t = timestamp * 0.001;
        driftX = Math.sin(t * 0.55) * 7 + Math.sin(t * 0.13 + 1.6) * 3;
        driftY = Math.cos(t * 0.47) * 6 + Math.cos(t * 0.16 + 0.8) * 2.5;
        const rotationDeg = Math.sin(t * 0.22) * 0.65 + Math.cos(t * 0.09) * 0.2;

        rotation = (rotationDeg * Math.PI) / 180;
        cosR = Math.cos(rotation);
        sinR = Math.sin(rotation);
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      context.save();
      context.translate(centerX + driftX, centerY + driftY);
      context.rotate(rotation);
      context.translate(-centerX, -centerY);
      drawFullGrid();
      context.restore();

      let nearestX = 0;
      let nearestY = 0;
      let nearestKey = -1;
      let nearestDistance = Number.POSITIVE_INFINITY;

      if (pointer.active) {
        const translatedPointerX = pointer.x - centerX - driftX;
        const translatedPointerY = pointer.y - centerY - driftY;
        const pointerLocalX = centerX + translatedPointerX * cosR + translatedPointerY * sinR;
        const pointerLocalY = centerY - translatedPointerX * sinR + translatedPointerY * cosR;
        const nearestCell = findNearestCell(pointerLocalX, pointerLocalY);

        if (nearestCell) {
          const relativeX = nearestCell.x - centerX;
          const relativeY = nearestCell.y - centerY;

          nearestX = centerX + relativeX * cosR - relativeY * sinR + driftX;
          nearestY = centerY + relativeX * sinR + relativeY * cosR + driftY;
          nearestDistance = nearestCell.distance;
          nearestKey = nearestCell.key;
        }
      }

      const hasNearestTarget = pointer.active && nearestKey !== -1 && nearestDistance < radius * radius * 5.8;

      if (hasNearestTarget) {
        if (nearestKey !== activeHighlight.key) {
          const jumpX = nearestX - activeHighlight.x;
          const jumpY = nearestY - activeHighlight.y;
          const jumpDistanceSq = jumpX * jumpX + jumpY * jumpY;

          if (activeHighlight.key === null) {
            activeHighlight.x = nearestX;
            activeHighlight.y = nearestY;
          } else if (jumpDistanceSq > (radius * 2.2) ** 2) {
            activeHighlight.x = nearestX;
            activeHighlight.y = nearestY;
          }

          activeHighlight.key = nearestKey;
        }

        activeHighlight.x += (nearestX - activeHighlight.x) * followStrength;
        activeHighlight.y += (nearestY - activeHighlight.y) * followStrength;
      }

      const targetAlpha = hasNearestTarget ? 0.92 : 0;
      const activeAlphaStrength = hasNearestTarget ? alphaStrength : fadeStrength;
      activeHighlight.alpha += (targetAlpha - activeHighlight.alpha) * activeAlphaStrength;

      if (!hasNearestTarget && activeHighlight.alpha < 0.01) {
        activeHighlight.key = null;
      }

      if (hasNearestTarget && !reduceMotionEnabled) {
        addTrailPoint(
          activeHighlight.x,
          activeHighlight.y,
          activeHighlight.key,
          radius,
          timestamp,
          activeHighlight.alpha,
        );
      }

      decayTrail(delta, radius);
      renderTrail();

      renderHighlight(activeHighlight.x, activeHighlight.y, radius, activeHighlight.alpha, 1);

      const shouldContinue = !reduceMotionEnabled && isVisible;

      if (shouldContinue) {
        frame = window.requestAnimationFrame(draw);
      } else {
        frame = null;
      }
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = 1;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      buildGeometry();
      clearTrail();
      draw(performance.now());
    };

    const onMove = (event) => {
      if (event.clientX === pointer.x && event.clientY === pointer.y) {
        return;
      }

      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;

      if (reduceMotionEnabled) {
        draw(performance.now());
        return;
      }

      startAnimation();
    };

    const onLeave = () => {
      pointer.active = false;

      if (reduceMotionEnabled) {
        draw(performance.now());
        return;
      }

      startAnimation();
    };

    const onPointerOut = (event) => {
      if (event.relatedTarget === null) {
        onLeave();
      }
    };

    const onVisibilityChange = () => {
      isVisible = !document.hidden;

      if (!isVisible) {
        stopAnimation();
        return;
      }

      if (reduceMotionEnabled) {
        draw(performance.now());
        return;
      }

      startAnimation();
    };

    const onReducedMotionChange = (event) => {
      reduceMotionEnabled = event.matches;
      pointer.active = false;
      activeHighlight.alpha = 0;
      activeHighlight.key = null;
      clearTrail();

      stopAnimation();

      if (reduceMotionEnabled) {
        draw(performance.now());
      } else {
        startAnimation();
      }
    };

    const observer = new MutationObserver(() => {
      palette = getPalette();
      renderGridBitmap();

      if (reduceMotionEnabled || frame === null) {
        draw(performance.now());
      }
    });

    if (typeof window.matchMedia === "function") {
      reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      reduceMotionEnabled = reducedMotionQuery.matches;

      if (typeof reducedMotionQuery.addEventListener === "function") {
        reducedMotionQuery.addEventListener("change", onReducedMotionChange);
      } else if (typeof reducedMotionQuery.addListener === "function") {
        reducedMotionQuery.addListener(onReducedMotionChange);
      }
    }

    resize();

    if (!reduceMotionEnabled) {
      startAnimation();
    }

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointercancel", onLeave);
    window.addEventListener("pointerout", onPointerOut);
    window.addEventListener("blur", onLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointercancel", onLeave);
      window.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("blur", onLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      observer.disconnect();

      if (reducedMotionQuery) {
        if (typeof reducedMotionQuery.removeEventListener === "function") {
          reducedMotionQuery.removeEventListener("change", onReducedMotionChange);
        } else if (typeof reducedMotionQuery.removeListener === "function") {
          reducedMotionQuery.removeListener(onReducedMotionChange);
        }
      }

      stopAnimation();
    };
  }, []);

  return <canvas ref={canvasRef} className="hex-bg-canvas" aria-hidden="true" />;
}
