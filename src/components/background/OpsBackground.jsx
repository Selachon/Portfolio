import { useEffect, useRef } from "react";

/* ──────────────────────────────────────────────
   BACKGROUND — generative grid of dots that pulse,
   with a soft mouse spotlight + occasional comet line,
   plus a 12-col hairline overlay.
   ────────────────────────────────────────────── */
function CanvasBg() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999, has: false });
  const rafRef = useRef(0);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return undefined;
    const ctx = cvs.getContext("2d");

    let w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let dots = [];
    let comets = [];
    let lastComet = 0;
    const SPACING = 38;

    const readAccent = () =>
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#ff4d00";
    const readInk = () =>
      getComputedStyle(document.documentElement).getPropertyValue("--ink-3").trim() || "#6E6A62";

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      cvs.style.width = w + "px";
      cvs.style.height = h + "px";
      cvs.width = w * dpr;
      cvs.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      dots = [];
      const cols = Math.ceil(w / SPACING) + 2;
      const rows = Math.ceil(h / SPACING) + 2;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          dots.push({
            x: i * SPACING,
            y: j * SPACING,
            phase: Math.random() * Math.PI * 2,
            base: 0.06 + Math.random() * 0.08,
          });
        }
      }
    };

    const onMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.has = true;
    };
    const onLeave = () => { mouseRef.current.has = false; };

    const start = performance.now();
    const draw = (now) => {
      const t = (now - start) * 0.001;
      ctx.clearRect(0, 0, w, h);

      const accent = readAccent();
      const ink = readInk();
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const has = mouseRef.current.has;

      for (const d of dots) {
        let alpha = d.base + 0.04 * Math.sin(t * 1.1 + d.phase);
        let useAccent = false;
        if (has) {
          const dx = d.x - mx, dy = d.y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) {
            const k = 1 - dist / 160;
            alpha = Math.min(0.85, alpha + k * 0.6);
            if (dist < 50) useAccent = true;
          }
        }
        ctx.fillStyle = useAccent ? accent : ink;
        ctx.globalAlpha = alpha;
        ctx.fillRect(d.x - 1, d.y - 1, 2, 2);
      }
      ctx.globalAlpha = 1;

      if (now - lastComet > 2200 && comets.length < 3) {
        lastComet = now;
        const fromLeft = Math.random() > 0.5;
        comets.push({
          x: fromLeft ? -20 : w + 20,
          y: 80 + Math.random() * (h - 160),
          vx: fromLeft ? 4 + Math.random() * 2 : -(4 + Math.random() * 2),
          vy: (Math.random() - 0.5) * 0.4,
          life: 0,
          max: 200 + Math.random() * 100,
        });
      }

      for (let i = comets.length - 1; i >= 0; i--) {
        const c = comets[i];
        c.x += c.vx;
        c.y += c.vy;
        c.life += 1;
        const trail = 80;
        const grad = ctx.createLinearGradient(c.x - c.vx * trail, c.y - c.vy * trail, c.x, c.y);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, accent);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = Math.max(0, 1 - c.life / c.max);
        ctx.beginPath();
        ctx.moveTo(c.x - c.vx * trail, c.y - c.vy * trail);
        ctx.lineTo(c.x, c.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (c.life > c.max || c.x < -40 || c.x > w + 40) comets.splice(i, 1);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    resize();
    rafRef.current = requestAnimationFrame(draw);

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="canvas-bg" aria-hidden="true" />;
}

export default function OpsBackground() {
  return (
    <>
      <CanvasBg />
      <div className="gridlines" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => <span key={i} />)}
      </div>
    </>
  );
}
