import { useMemo, useState } from "react";
import DemoLayout from "../../components/demo/DemoLayout.jsx";

const PRESETS = {
  support: {
    label: {
      es: "Mesa de soporte",
      en: "Support desk",
    },
    description: {
      es: "Procesa tickets entrantes, enruta por prioridad y reduce incumplimientos de SLA.",
      en: "Process incoming tickets, route by priority, and reduce SLA breaches.",
    },
    defaults: {
      dailyVolume: "72",
      highIntentRate: "38",
      teamSize: "5",
      slaMinutes: "120",
      channel: "slack",
    },
    rules: {
      classify: true,
      dedupe: true,
      smartRoute: true,
      reminders: false,
      slaShield: true,
    },
  },
  billing: {
    label: {
      es: "Cobranza y cartera",
      en: "Billing and collections",
    },
    description: {
      es: "Prioriza cuentas vencidas, activa recordatorios y escalamientos de forma automatizada.",
      en: "Prioritize overdue accounts and trigger reminders and escalations automatically.",
    },
    defaults: {
      dailyVolume: "54",
      highIntentRate: "52",
      teamSize: "4",
      slaMinutes: "180",
      channel: "whatsapp",
    },
    rules: {
      classify: true,
      dedupe: true,
      smartRoute: true,
      reminders: true,
      slaShield: true,
    },
  },
  leads: {
    label: {
      es: "Pipeline comercial",
      en: "Sales pipeline",
    },
    description: {
      es: "Califica leads, evita duplicados y asigna seguimiento al equipo correcto.",
      en: "Score leads, prevent duplicates, and assign follow-up to the right team.",
    },
    defaults: {
      dailyVolume: "38",
      highIntentRate: "61",
      teamSize: "3",
      slaMinutes: "90",
      channel: "email",
    },
    rules: {
      classify: true,
      dedupe: true,
      smartRoute: true,
      reminders: true,
      slaShield: false,
    },
  },
};

const AUTO_COPY = {
  es: {
    title: "Demo | Automation Command Center",
    subtitle:
      "Una simulacion clara de automatizacion operativa: configuras carga, activas reglas y ves impacto real en cola, SLA y tiempos.",
    preset: "Plantilla operativa",
    setup: "Configuracion de carga",
    rules: "Reglas de automatizacion",
    run: "Simular operacion",
    running: "Simulando...",
    loadPreset: "Restaurar plantilla",
    clearOutput: "Limpiar salida",
    timeline: "Timeline de ejecucion",
    report: "Impacto estimado",
    progress: "Progreso",
    noEvents: "Aun no hay eventos. Ejecuta la simulacion para ver la trazabilidad.",
    noReport: "Sin reporte aun. Corre una simulacion para ver before/after.",
    invalidInput: "Configuracion invalida. Verifica volumen, equipo y SLA con valores mayores a 0.",
    started: "Simulacion iniciada.",
    completed: "Simulacion completada.",
    stageIngest: "Ingestando lote entrante",
    stageClassify: "Aplicando clasificacion y deduplicacion",
    stageRouteSmart: "Ruteando items con score de prioridad",
    stageRouteBasic: "Aplicando ruteo basico por canal",
    stageExecute: "Ejecutando acciones y notificaciones",
    dailyVolume: "Volumen diario",
    highIntentRate: "Casos de alta prioridad",
    teamSize: "Tamano del equipo",
    slaMinutes: "SLA objetivo (min)",
    channel: "Canal principal",
    channelEmail: "Email",
    channelWhatsapp: "WhatsApp",
    channelSlack: "Slack",
    classifyTitle: "Clasificacion automatica",
    classifyDesc: "Etiqueta tipo de caso y urgencia al ingresar.",
    dedupeTitle: "Deteccion de duplicados",
    dedupeDesc: "Consolida registros repetidos para evitar retrabajo.",
    smartRouteTitle: "Ruteo inteligente",
    smartRouteDesc: "Asigna casos al equipo con mejor capacidad actual.",
    remindersTitle: "Recordatorios proactivos",
    remindersDesc: "Dispara follow-ups automaticos en casos inactivos.",
    slaShieldTitle: "Escudo SLA",
    slaShieldDesc: "Escala casos criticos antes de incumplir tiempos.",
    metricProcessed: "Items procesados",
    metricAutoHandled: "Gestionados automaticamente",
    metricAvoided: "Incumplimientos evitados",
    metricAvgAfter: "Tiempo medio final",
    before: "Antes",
    after: "Despues",
    details: "Detalle estructurado",
  },
  en: {
    title: "Demo | Automation Command Center",
    subtitle:
      "A clear operations automation simulation: configure workload, enable rules, and see real impact on queue, SLA, and handling time.",
    preset: "Operational preset",
    setup: "Workload configuration",
    rules: "Automation rules",
    run: "Simulate operation",
    running: "Simulating...",
    loadPreset: "Restore preset",
    clearOutput: "Clear output",
    timeline: "Execution timeline",
    report: "Estimated impact",
    progress: "Progress",
    noEvents: "No events yet. Run the simulation to see traceability.",
    noReport: "No report yet. Run a simulation to see before/after impact.",
    invalidInput: "Invalid configuration. Verify volume, team, and SLA with values greater than 0.",
    started: "Simulation started.",
    completed: "Simulation completed.",
    stageIngest: "Ingesting incoming batch",
    stageClassify: "Applying classification and deduplication",
    stageRouteSmart: "Routing items with priority scoring",
    stageRouteBasic: "Applying basic channel routing",
    stageExecute: "Executing actions and notifications",
    dailyVolume: "Daily volume",
    highIntentRate: "High-priority cases",
    teamSize: "Team size",
    slaMinutes: "Target SLA (min)",
    channel: "Primary channel",
    channelEmail: "Email",
    channelWhatsapp: "WhatsApp",
    channelSlack: "Slack",
    classifyTitle: "Auto classification",
    classifyDesc: "Tag case type and urgency on intake.",
    dedupeTitle: "Duplicate detection",
    dedupeDesc: "Merge repeated records to avoid rework.",
    smartRouteTitle: "Smart routing",
    smartRouteDesc: "Assign cases to the team with best current capacity.",
    remindersTitle: "Proactive reminders",
    remindersDesc: "Trigger automatic follow-ups on inactive cases.",
    slaShieldTitle: "SLA shield",
    slaShieldDesc: "Escalate critical cases before breaching targets.",
    metricProcessed: "Processed items",
    metricAutoHandled: "Auto-handled",
    metricAvoided: "Breaches avoided",
    metricAvgAfter: "Final average handle time",
    before: "Before",
    after: "After",
    details: "Structured details",
  },
};

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatTime(value, locale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function getPreset(id) {
  return PRESETS[id] ?? PRESETS.support;
}

function buildPresetConfig(id) {
  return { ...getPreset(id).defaults };
}

function buildPresetRules(id) {
  return { ...getPreset(id).rules };
}

export default function DemoAutomation({ locale }) {
  const copy = AUTO_COPY[locale] ?? AUTO_COPY.es;
  const [presetId, setPresetId] = useState("support");
  const [config, setConfig] = useState(() => buildPresetConfig("support"));
  const [rules, setRules] = useState(() => buildPresetRules("support"));
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [report, setReport] = useState(null);

  const preset = getPreset(presetId);
  const presetOptions = useMemo(() => Object.entries(PRESETS), []);

  const channelLabel = {
    email: copy.channelEmail,
    whatsapp: copy.channelWhatsapp,
    slack: copy.channelSlack,
  };

  const ruleCatalog = [
    { id: "classify", title: copy.classifyTitle, description: copy.classifyDesc },
    { id: "dedupe", title: copy.dedupeTitle, description: copy.dedupeDesc },
    { id: "smartRoute", title: copy.smartRouteTitle, description: copy.smartRouteDesc },
    { id: "reminders", title: copy.remindersTitle, description: copy.remindersDesc },
    { id: "slaShield", title: copy.slaShieldTitle, description: copy.slaShieldDesc },
  ];

  const pushLog = (level, message) => {
    setLogs((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        level,
        message,
        at: new Date().toISOString(),
      },
    ]);
  };

  const handlePresetChange = (nextPresetId) => {
    setPresetId(nextPresetId);
    setConfig(buildPresetConfig(nextPresetId));
    setRules(buildPresetRules(nextPresetId));
    setIsRunning(false);
    setProgress(0);
    setLogs([]);
    setReport(null);
  };

  const handleRun = async () => {
    if (isRunning) return;

    const dailyVolumeNumber = Number(config.dailyVolume);
    const highIntentRateNumber = Number(config.highIntentRate);
    const teamSizeNumber = Number(config.teamSize);
    const slaMinutesNumber = Number(config.slaMinutes);

    const isValid =
      Number.isFinite(dailyVolumeNumber) &&
      Number.isFinite(highIntentRateNumber) &&
      Number.isFinite(teamSizeNumber) &&
      Number.isFinite(slaMinutesNumber) &&
      dailyVolumeNumber > 0 &&
      teamSizeNumber > 0 &&
      slaMinutesNumber > 0;

    if (!isValid) {
      pushLog("error", copy.invalidInput);
      return;
    }

    const dailyVolume = clamp(Math.round(dailyVolumeNumber), 1, 500);
    const highIntentRate = clamp(Math.round(highIntentRateNumber), 5, 95);
    const teamSize = clamp(Math.round(teamSizeNumber), 1, 60);
    const slaMinutes = clamp(Math.round(slaMinutesNumber), 20, 1440);

    setIsRunning(true);
    setProgress(0);
    setLogs([]);
    setReport(null);
    pushLog("info", copy.started);

    const stages = [
      copy.stageIngest,
      copy.stageClassify,
      rules.smartRoute ? copy.stageRouteSmart : copy.stageRouteBasic,
      copy.stageExecute,
    ];

    for (let index = 0; index < stages.length; index += 1) {
      pushLog("info", `${index + 1}/${stages.length} - ${stages[index]}`);
      await wait(230 + index * 70);
      setProgress(Math.round(((index + 1) / stages.length) * 100));
      pushLog("success", `${stages[index]} ✓`);
    }

    const highPriorityItems = Math.round((dailyVolume * highIntentRate) / 100);
    const classifyGain = rules.classify ? 0.22 : 0.05;
    const dedupeGain = rules.dedupe ? 0.14 : 0.01;
    const reminderGain = rules.reminders ? (presetId === "billing" ? 0.16 : 0.08) : 0;
    const autoHandled = Math.min(dailyVolume, Math.round(dailyVolume * (classifyGain + dedupeGain + reminderGain)));
    const manualQueue = Math.max(0, dailyVolume - autoHandled);

    const routedPriority = rules.smartRoute ? Math.round(highPriorityItems * 0.86) : Math.round(highPriorityItems * 0.46);
    const avgHandleBefore = Math.max(7, Math.round((dailyVolume / teamSize) * 6.2));
    const avgHandleAfter = Math.max(
      4,
      avgHandleBefore - Math.round((autoHandled / Math.max(1, dailyVolume)) * 9) - (rules.smartRoute ? 3 : 0),
    );

    const breachesBefore = Math.round(dailyVolume * Math.max(0.16, 0.44 - highIntentRate / 220));
    const breachesAfter = Math.max(
      0,
      breachesBefore -
        Math.round(autoHandled * 0.31) -
        (rules.smartRoute ? Math.round(breachesBefore * 0.26) : 0) -
        (rules.slaShield ? Math.round(breachesBefore * 0.14) : 0),
    );

    const breachesAvoided = Math.max(0, breachesBefore - breachesAfter);

    const structuredReport = {
      preset: preset.label[locale] ?? preset.label.es,
      channel: channelLabel[config.channel] ?? config.channel,
      dailyVolume,
      highPriorityItems,
      autoHandled,
      manualQueue,
      routedPriority,
      avgHandleBefore,
      avgHandleAfter,
      slaMinutes,
      breachesBefore,
      breachesAfter,
      breachesAvoided,
      activeRules: Object.entries(rules)
        .filter(([, enabled]) => enabled)
        .map(([ruleId]) => ruleId),
    };

    setReport(structuredReport);
    pushLog("success", copy.completed);
    setIsRunning(false);
  };

  return (
    <DemoLayout locale={locale} title={copy.title} subtitle={copy.subtitle} theme="automation">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 14 }}>
        <section className="card" style={{ gridColumn: "span 12", padding: 18 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>{copy.preset}</span>
            <select className="demo-input" value={presetId} onChange={(event) => handlePresetChange(event.target.value)}>
              {presetOptions.map(([id, option]) => (
                <option key={id} value={id}>
                  {option.label[locale] ?? option.label.es}
                </option>
              ))}
            </select>
          </label>

          <p style={{ margin: "10px 0 0", color: "var(--muted)", lineHeight: 1.7 }}>
            {preset.description[locale] ?? preset.description.es}
          </p>
        </section>

        <section className="card" style={{ gridColumn: "span 12", padding: 18 }}>
          <h2 style={{ margin: 0, fontSize: "clamp(1.08rem, 2.4vw, 1.25rem)" }}>{copy.setup}</h2>
          <div style={{ height: 12 }} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>{copy.dailyVolume}</span>
              <input
                className="demo-input"
                type="number"
                min="1"
                value={config.dailyVolume}
                onChange={(event) => setConfig((current) => ({ ...current, dailyVolume: event.target.value }))}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>
                {copy.highIntentRate} ({config.highIntentRate}%)
              </span>
              <input
                style={{ width: "100%", accentColor: "var(--accent)" }}
                type="range"
                min="5"
                max="95"
                step="1"
                value={config.highIntentRate}
                onChange={(event) => setConfig((current) => ({ ...current, highIntentRate: event.target.value }))}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>{copy.teamSize}</span>
              <input
                className="demo-input"
                type="number"
                min="1"
                value={config.teamSize}
                onChange={(event) => setConfig((current) => ({ ...current, teamSize: event.target.value }))}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>{copy.slaMinutes}</span>
              <input
                className="demo-input"
                type="number"
                min="20"
                value={config.slaMinutes}
                onChange={(event) => setConfig((current) => ({ ...current, slaMinutes: event.target.value }))}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>{copy.channel}</span>
              <select
                className="demo-input"
                value={config.channel}
                onChange={(event) => setConfig((current) => ({ ...current, channel: event.target.value }))}
              >
                <option value="email">{copy.channelEmail}</option>
                <option value="whatsapp">{copy.channelWhatsapp}</option>
                <option value="slack">{copy.channelSlack}</option>
              </select>
            </label>
          </div>
        </section>

        <section className="card" style={{ gridColumn: "span 12", padding: 18 }}>
          <h2 style={{ margin: 0, fontSize: "clamp(1.08rem, 2.4vw, 1.25rem)" }}>{copy.rules}</h2>
          <div style={{ height: 12 }} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
            {ruleCatalog.map((rule) => (
              <label
                key={rule.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "10px 12px",
                  display: "grid",
                  gap: 6,
                  background: "color-mix(in srgb, var(--bg-elev) 86%, transparent)",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={rules[rule.id]}
                    onChange={(event) =>
                      setRules((current) => ({
                        ...current,
                        [rule.id]: event.target.checked,
                      }))
                    }
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <strong>{rule.title}</strong>
                </span>
                <small style={{ color: "var(--muted)", lineHeight: 1.55 }}>{rule.description}</small>
              </label>
            ))}
          </div>

          <div style={{ height: 12 }} />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="btn" onClick={handleRun} disabled={isRunning}>
              {isRunning ? copy.running : copy.run}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setConfig(buildPresetConfig(presetId));
                setRules(buildPresetRules(presetId));
              }}
            >
              {copy.loadPreset}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setProgress(0);
                setLogs([]);
                setReport(null);
              }}
            >
              {copy.clearOutput}
            </button>
          </div>
        </section>

        <section className="card" style={{ gridColumn: "span 12", padding: 18 }}>
          <h2 style={{ margin: 0, fontSize: "clamp(1.12rem, 2.6vw, 1.34rem)" }}>{copy.report}</h2>
          <div style={{ height: 10 }} />

          {report ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
                <div className="demo-log-item demo-log-item--info">
                  <span>{copy.metricProcessed}</span>
                  <strong>{report.dailyVolume}</strong>
                </div>
                <div className="demo-log-item demo-log-item--success">
                  <span>{copy.metricAutoHandled}</span>
                  <strong>{report.autoHandled}</strong>
                </div>
                <div className="demo-log-item demo-log-item--success">
                  <span>{copy.metricAvoided}</span>
                  <strong>{report.breachesAvoided}</strong>
                </div>
                <div className="demo-log-item demo-log-item--info">
                  <span>{copy.metricAvgAfter}</span>
                  <strong>{report.avgHandleAfter}m</strong>
                </div>
              </div>

              <div style={{ height: 10 }} />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                <div className="demo-log-item">
                  <span>
                    {copy.before}: {report.avgHandleBefore}m / {report.breachesBefore} SLA
                  </span>
                </div>
                <div className="demo-log-item">
                  <span>
                    {copy.after}: {report.avgHandleAfter}m / {report.breachesAfter} SLA
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p style={{ margin: 0, color: "var(--muted)" }}>{copy.noReport}</p>
          )}
        </section>

        <section className="card" style={{ gridColumn: "span 12", padding: 18 }}>
          <h2 style={{ margin: 0, fontSize: "clamp(1.12rem, 2.6vw, 1.34rem)" }}>{copy.timeline}</h2>

          <div style={{ height: 8 }} />

          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)", fontSize: 13 }}>
            <span>{copy.progress}</span>
            <span>{progress}%</span>
          </div>

          <div
            style={{
              marginTop: 6,
              width: "100%",
              height: 10,
              borderRadius: 999,
              border: "1px solid var(--border)",
              overflow: "hidden",
              background: "color-mix(in srgb, var(--bg-elev) 88%, transparent)",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background:
                  "linear-gradient(90deg, color-mix(in srgb, var(--accent) 82%, var(--bg-elev)), color-mix(in srgb, var(--accent-2) 70%, var(--bg-elev)))",
                transition: "width 220ms var(--ease)",
              }}
            />
          </div>

          <div style={{ height: 10 }} />

          {logs.length === 0 ? (
            <p style={{ margin: 0, color: "var(--muted)" }}>{copy.noEvents}</p>
          ) : (
            <div className="demo-log-list">
              {logs.map((entry) => (
                <div key={entry.id} className={`demo-log-item demo-log-item--${entry.level}`}>
                  <span>{entry.message}</span>
                  <small>{formatTime(entry.at, locale)}</small>
                </div>
              ))}
            </div>
          )}
        </section>

        {report ? (
          <section className="card" style={{ gridColumn: "span 12", padding: 18 }}>
            <h2 style={{ margin: 0, fontSize: "clamp(1.12rem, 2.6vw, 1.34rem)" }}>{copy.details}</h2>
            <pre className="demo-code-block">{JSON.stringify(report, null, 2)}</pre>
          </section>
        ) : null}
      </div>
    </DemoLayout>
  );
}
