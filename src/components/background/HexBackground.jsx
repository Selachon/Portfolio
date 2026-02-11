import { useEffect, useRef } from "react";

function drawHexPath(ctx, cx, cy, radius) {
  ctx.beginPath();

  for (let index = 0; index < 6; index += 1) {
    const angle = ((60 * index - 30) * Math.PI) / 180;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.closePath();
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

    const context = canvas.getContext("2d", { alpha: true });
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

    const trailingHighlight = {
      x: pointer.x,
      y: pointer.y,
      alpha: 0,
    };

    let frame = null;
    let lastDraw = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let palette = getPalette();

    const renderHighlight = (centerX, centerY, radius, alpha, intensity = 1) => {
      if (alpha <= 0.01) return;

      context.save();
      context.globalAlpha = Math.min(1, alpha);
      context.shadowColor = palette.activeGlow;
      context.shadowBlur = 10 + intensity * 14;
      context.fillStyle = palette.fill;
      context.strokeStyle = palette.activeStroke;
      context.lineWidth = 1.3;

      drawHexPath(context, centerX, centerY, radius);
      context.fill();
      context.stroke();
      context.restore();
    };

    const draw = (timestamp) => {
      if (timestamp - lastDraw < 1000 / 36) {
        frame = window.requestAnimationFrame(draw);
        return;
      }

      lastDraw = timestamp;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      const radius = width < 640 ? 14 : width < 1120 ? 17 : 20;
      const stepX = Math.sqrt(3) * radius;
      const stepY = radius * 1.5;
      const t = timestamp * 0.001;
      const driftX = Math.sin(t * 0.55) * 8 + Math.sin(t * 0.13 + 1.6) * 4;
      const driftY = Math.cos(t * 0.47) * 7 + Math.cos(t * 0.16 + 0.8) * 3;
      const rotationDeg = Math.sin(t * 0.23) * 0.8 + Math.cos(t * 0.09) * 0.25;
      const rotation = (rotationDeg * Math.PI) / 180;
      const cosR = Math.cos(rotation);
      const sinR = Math.sin(rotation);
      const centerX = width * 0.5;
      const centerY = height * 0.5;

      context.save();
      context.globalAlpha = 0.82;
      context.strokeStyle = palette.line;
      context.lineWidth = 0.8;

      let nearest = null;
      let nearestDistance = Number.POSITIVE_INFINITY;

      let row = 0;
      for (let y = -stepY * 2; y < height + stepY * 2; y += stepY) {
        const offset = row % 2 === 0 ? 0 : stepX / 2;
        const yWithDrift = y + driftY;
        let column = 0;

        for (let x = -stepX * 2; x < width + stepX * 2; x += stepX) {
          const rawX = x + offset + driftX;
          const rawY = yWithDrift;
          const relativeX = rawX - centerX;
          const relativeY = rawY - centerY;
          const cx = centerX + relativeX * cosR - relativeY * sinR;
          const cy = centerY + relativeX * sinR + relativeY * cosR;

          drawHexPath(context, cx, cy, radius);
          context.stroke();

          if (pointer.active) {
            const dx = pointer.x - cx;
            const dy = pointer.y - cy;
            const distance = dx * dx + dy * dy;

            if (distance < nearestDistance) {
              nearestDistance = distance;
              nearest = {
                x: cx,
                y: cy,
                key: `${row}-${column}`,
              };
            }
          }

          column += 1;
        }

        row += 1;
      }

      context.restore();

      const hasNearestTarget = pointer.active && nearest && nearestDistance < radius * radius * 4.8;

      if (hasNearestTarget) {
        if (nearest.key !== activeHighlight.key) {
          trailingHighlight.x = activeHighlight.x;
          trailingHighlight.y = activeHighlight.y;
          trailingHighlight.alpha = Math.max(trailingHighlight.alpha, activeHighlight.alpha * 0.85);
          activeHighlight.key = nearest.key;
        }

        activeHighlight.x += (nearest.x - activeHighlight.x) * 0.24;
        activeHighlight.y += (nearest.y - activeHighlight.y) * 0.24;
      }

      const targetAlpha = hasNearestTarget ? 0.84 : 0;
      activeHighlight.alpha += (targetAlpha - activeHighlight.alpha) * 0.14;
      trailingHighlight.alpha += (0 - trailingHighlight.alpha) * 0.1;

      if (!hasNearestTarget && activeHighlight.alpha < 0.02) {
        activeHighlight.key = null;
      }

      renderHighlight(trailingHighlight.x, trailingHighlight.y, radius, trailingHighlight.alpha * 0.8, 0.8);
      renderHighlight(activeHighlight.x, activeHighlight.y, radius, activeHighlight.alpha, 1);

      frame = window.requestAnimationFrame(draw);
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    const onMove = (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
    };

    const onLeave = () => {
      pointer.active = false;
    };

    const observer = new MutationObserver(() => {
      palette = getPalette();
    });

    resize();

    frame = window.requestAnimationFrame(draw);

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      observer.disconnect();

      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  return <canvas ref={canvasRef} className="hex-bg-canvas" aria-hidden="true" />;
}
