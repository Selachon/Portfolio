import { useEffect, useMemo, useState } from "react";

// Faux live timestamp — isolated in a module helper to keep render pure.
function makeTimestamp(offset) {
  return String((Date.now() / 1000 - offset * 7) | 0).slice(-5);
}

// Decorative "operations" feed — scrolls through static lines on a timer.
// Not wired to real telemetry: `badge` and `footer` must say so on screen.
export default function StatusTicker({ items, label, footer, badge = "STREAM · DEMO" }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1400);
    return () => clearInterval(i);
  }, []);

  const visible = useMemo(() => {
    const out = [];
    const N = 8;
    for (let i = 0; i < N; i++) {
      const idx = (tick + i) % items.length;
      const it = items[idx];
      out.push({ ...it, ts: makeTimestamp(i) });
    }
    return out;
  }, [tick, items]);

  return (
    <div className="ticker">
      <div className="ticker__head">
        <span><span className="dot" /> {label}</span>
        <span>{badge}</span>
      </div>
      <div className="ticker__body">
        {visible.map((line, i) => (
          <div className="ticker__line" key={i + line.t}>
            <span className="ts">{line.ts}</span>
            <span className="arr">{line.k === "ok" ? "✓" : "›"}</span>
            <span>{line.t}</span>
            <span className={line.k === "ok" ? "ok" : "warn"}>{line.v}</span>
          </div>
        ))}
      </div>
      <div className="ticker__head" style={{ borderBottom: 0, borderTop: "1px solid var(--hair)" }}>
        <span>{footer}</span>
        <span>›</span>
      </div>
    </div>
  );
}
