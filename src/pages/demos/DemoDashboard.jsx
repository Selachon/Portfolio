import { useMemo, useState } from "react";
import DemoReturn from "../../components/demo/DemoReturn.jsx";

const RANGE_SEED = { "24H": 0, "7D": 5, "30D": 9 };

// Synthetic series generator. In a module helper so render stays pure;
// `rangeOffset` re-seeds every series when the time range changes.
function makeSeries(rangeOffset) {
  const make = (seed, len = 44) => {
    const s = seed + rangeOffset;
    const out = [];
    let v = 50 + (s * 7) % 30;
    for (let i = 0; i < len; i++) {
      v += (Math.sin(i * 0.3 + s) + Math.random() - 0.5) * 6;
      v = Math.max(12, Math.min(94, v));
      out.push(v);
    }
    return out;
  };
  return { req: make(11), conv: make(41), spark1: make(3, 18), spark2: make(8, 18), spark3: make(15, 18), spark4: make(22, 18) };
}

/* DEMO 4 · DASHBOARD — skin "Nebula" (dark neon analytics) */
export default function DemoDashboard({ locale }) {
  const [range, setRange] = useState("24H");
  const series = useMemo(() => makeSeries(RANGE_SEED[range] ?? 0), [range]);

  const kpis = [
    { k: locale === "es" ? "Req / min" : "Req / min", v: "1,284", tr: "+12.4%", up: true, c: "#22D3EE", sp: series.spark1 },
    { k: locale === "es" ? "Latencia p95" : "Latency p95", v: "184ms", tr: "-8.1%", up: true, c: "#818CF8", sp: series.spark2 },
    { k: locale === "es" ? "Tasa de error" : "Error rate", v: "0.04%", tr: "+0.01pp", up: false, c: "#F472B6", sp: series.spark3 },
    { k: locale === "es" ? "Conversión" : "Conversion", v: "3.2%", tr: "+0.4pp", up: true, c: "#A3E635", sp: series.spark4 },
  ];
  const ring = [
    { l: locale === "es" ? "Directo" : "Direct", v: 42, c: "#22D3EE" },
    { l: locale === "es" ? "Orgánico" : "Organic", v: 31, c: "#818CF8" },
    { l: "Referral", v: 17, c: "#F472B6" },
    { l: locale === "es" ? "Campaña" : "Campaign", v: 10, c: "#A3E635" },
  ];
  const bars = [38, 62, 47, 80, 56, 71, 90];
  const dayLabels = locale === "es" ? ["L", "M", "X", "J", "V", "S", "D"] : ["M", "T", "W", "T", "F", "S", "S"];
  const events = [
    { ts: "23:14:02", nm: "deploy.success", vl: "fares · main · 3a4f" },
    { ts: "23:13:58", nm: "cron.executed", vl: "auto · cron_07 · 240ms" },
    { ts: "23:13:50", nm: "ticket.resolved", vl: "support · #4291" },
    { ts: "23:12:11", nm: "alert.cleared", vl: "latency · p95 < 200ms" },
    { ts: "23:11:08", nm: "user.login", vl: "admin@korabysela.dev" },
  ];

  return (
    <div className="page-demo fade-in">
      <DemoReturn locale={locale} n="04" name="DASHBOARD" styleName="Nebula — analytics" />
      <div className="skin-nebula">
        <div className="ne-top">
          <div>
            <h1 className="ne-title">{locale === "es" ? "Panel " : "Operations "}<span className="gl">{locale === "es" ? "operativo" : "overview"}</span></h1>
            <p className="ne-sub">{locale === "es" ? "Métricas en vivo · datos locales de simulación" : "Live metrics · local simulation data"}</p>
          </div>
          <div className="ne-range">
            {["24H", "7D", "30D"].map((r) => (
              <button key={r} className={range === r ? "on" : ""} onClick={() => setRange(r)}>{r}</button>
            ))}
          </div>
        </div>

        <div className="ne-kpis">
          {kpis.map((k) => (
            <div className="ne-kpi" key={k.k}>
              <div className="ne-kpi__k">{k.k}</div>
              <div className="ne-kpi__v">{k.v}</div>
              <div className={"ne-kpi__tr " + (k.up ? "up" : "down")}>{k.up ? "▲" : "▼"} {k.tr}</div>
              <svg className="ne-kpi__spark" viewBox="0 0 96 40" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke={k.c}
                  strokeWidth="2"
                  points={k.sp.map((v, i) => `${(i / (k.sp.length - 1)) * 96},${40 - (v / 100) * 36}`).join(" ")}
                />
              </svg>
            </div>
          ))}
        </div>

        <div className="ne-charts">
          <NeLine title={locale === "es" ? "Solicitudes / período" : "Requests / period"} data={series.req} />
          <div className="ne-panel">
            <div className="ne-panel__head"><span className="ne-panel__t">{locale === "es" ? "Fuentes de tráfico" : "Traffic sources"}</span><span className="ne-panel__live"><span className="ne-dot" /> LIVE</span></div>
            <NeRing data={ring} />
          </div>
        </div>

        <div className="ne-bottom">
          <div className="ne-panel">
            <div className="ne-panel__head"><span className="ne-panel__t">{locale === "es" ? "Conversiones / semana" : "Conversions / week"}</span></div>
            <div className="ne-bars">
              {bars.map((b, i) => (
                <div className="ne-bar" key={i}>
                  <div className="ne-bar__fill" style={{ height: `${b}%` }} />
                  <span className="ne-bar__l">{dayLabels[i]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="ne-panel">
            <div className="ne-panel__head"><span className="ne-panel__t">{locale === "es" ? "Eventos recientes" : "Recent events"}</span><span className="ne-panel__live"><span className="ne-dot" /> STREAM</span></div>
            <div className="ne-events">
              {events.map((e, i) => (
                <div className="ne-ev" key={i}><span className="t">{e.ts}</span><span className="ic">✓</span><span className="nm">{e.nm}</span><span className="vl">{e.vl}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NeLine({ title, data }) {
  const W = 600, H = 170;
  const min = Math.min(...data), max = Math.max(...data);
  const norm = (v) => H - 16 - ((v - min) / Math.max(1, max - min)) * (H - 34);
  const step = W / (data.length - 1);
  const path = data.map((v, i) => `${i === 0 ? "M" : "L"} ${i * step} ${norm(v)}`).join(" ");
  return (
    <div className="ne-panel">
      <div className="ne-panel__head"><span className="ne-panel__t">{title}</span><span className="ne-panel__live"><span className="ne-dot" /> LIVE</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 170 }}>
        <defs>
          <linearGradient id="ne-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
          </linearGradient>
          <filter id="ne-glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {[0.25, 0.5, 0.75].map((y) => <line key={y} x1="0" x2={W} y1={H * y} y2={H * y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />)}
        <path d={`${path} L ${W} ${H} L 0 ${H} Z`} fill="url(#ne-fill)" />
        <path d={path} fill="none" stroke="#22D3EE" strokeWidth="2.2" filter="url(#ne-glow)" />
      </svg>
    </div>
  );
}

function NeRing({ data }) {
  const total = data.reduce((s, d) => s + d.v, 0);
  const R = 52, C = 2 * Math.PI * R;
  // Derive each arc's cumulative offset from the slice before it, so no
  // outer variable is mutated during render.
  const arcs = data.map((d, i) => {
    const before = data.slice(0, i).reduce((s, x) => s + x.v, 0);
    return { ...d, dash: `${(d.v / total) * C} ${C}`, off: -(before / total) * C };
  });
  return (
    <div className="ne-ring">
      <svg width="132" height="132" viewBox="0 0 132 132">
        <circle cx="66" cy="66" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="16" />
        {arcs.map((d, i) => (
          <circle
            key={i}
            cx="66"
            cy="66"
            r={R}
            fill="none"
            stroke={d.c}
            strokeWidth="16"
            strokeDasharray={d.dash}
            strokeDashoffset={d.off}
            transform="rotate(-90 66 66)"
            style={{ filter: `drop-shadow(0 0 5px ${d.c}66)` }}
          />
        ))}
      </svg>
      <div className="ne-ring__legend">
        {data.map((d) => (
          <div className="ne-leg" key={d.l}><span className="sw" style={{ background: d.c }} /> {d.l} · <b>{d.v}%</b></div>
        ))}
      </div>
    </div>
  );
}
