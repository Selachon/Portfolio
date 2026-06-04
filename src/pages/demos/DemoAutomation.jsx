import { useRef, useState } from "react";
import DemoReturn from "../../components/demo/DemoReturn.jsx";

/* DEMO 3 · AUTOMATION — skin "Terminal" (black + neon green) */
export default function DemoAutomation({ locale }) {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [trigger, setTrigger] = useState("cron");
  const [target, setTarget] = useState("notify_slack");
  const idx = useRef(0);
  const STEPS = ["trigger.received", "auth.check", "data.fetch", "transform.run", "validation.pass", "action.dispatch", "log.persisted", "complete"];

  const run = () => {
    if (running) return;
    setRunning(true);
    setLogs([]);
    idx.current = 0;
    const tick = () => {
      if (idx.current >= STEPS.length) { setRunning(false); return; }
      const ts = new Date().toISOString().split("T")[1].slice(0, 8);
      const t = STEPS[idx.current];
      setLogs((arr) => [...arr, { ts, t, params: idx.current === 0 ? `${trigger} → ${target}` : "" }]);
      idx.current += 1;
      setTimeout(tick, 320 + Math.random() * 240);
    };
    tick();
  };
  const pct = Math.round((logs.length / STEPS.length) * 8);
  const bar = "#".repeat(pct) + "-".repeat(8 - pct);

  return (
    <div className="page-demo fade-in">
      <DemoReturn locale={locale} n="03" name={locale === "es" ? "AUTOMATIZACIÓN" : "AUTOMATION"} styleName="Terminal — dev/ops" />
      <div className="skin-terminal">
        <div className="tm-bar">
          <div className="tm-dots"><i /><i /><i /></div>
          <span className="tm-path">~/kora/automation — run</span>
          <span className="tm-status">● {running ? "running" : "idle"}</span>
        </div>
        <div className="tm-body">
          <p className="tm-h">{locale === "es" ? "Constructor de flujo" : "Flow builder"} <span className="blink">▮</span></p>
          <div className="tm-cmd">
            <span className="pr">$</span> kora run <span className="flag">--trigger=</span><span className="val">{trigger}</span> <span className="flag">--action=</span><span className="val">{target}</span>
          </div>
          <div className="tm-controls">
            <div className="tm-ctl">
              <label>--trigger</label>
              <select className="tm-select" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
                <option value="cron">cron · 07:00</option>
                <option value="webhook">webhook · /run</option>
                <option value="manual">manual</option>
              </select>
            </div>
            <div className="tm-ctl">
              <label>--action</label>
              <select className="tm-select" value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="notify_slack">notify · slack</option>
                <option value="email_report">email · daily report</option>
                <option value="sync_db">sync · database</option>
              </select>
            </div>
            <button className="tm-run" onClick={run} disabled={running}>{running ? "running…" : "▶ execute"}</button>
          </div>

          <p className="tm-h" style={{ marginTop: 6 }}>{locale === "es" ? "Salida" : "Output"}</p>
          <div className="tm-console">
            {logs.length === 0 && <div className="tm-empty">{locale === "es" ? "// sin ejecuciones. pulsa execute." : "// no runs yet. press execute."}</div>}
            {logs.map((l, i) => (
              <div className="tm-line" key={i}>
                <span className="ts">{l.ts}</span><span className="ar">›</span><span className="ms">{l.t}</span>{l.params && <span className="pm">{l.params}</span>}
              </div>
            ))}
            {(running || logs.length > 0) && (
              <div className="tm-bararow">
                <span className="tm-progress">[{bar}]</span>
                <span>{logs.length}/{STEPS.length}</span>
                {running && <span className="tm-cursor" />}
                {!running && logs.length === STEPS.length && <span>✓ {locale === "es" ? "completado" : "done"}</span>}
              </div>
            )}
          </div>
          <div className="tm-foot">// {locale === "es" ? "simulación local · sin llamadas externas" : "local simulation · no external calls"}</div>
        </div>
      </div>
    </div>
  );
}
