import { useMemo, useState } from "react";
import DemoLayout from "../../components/demo/DemoLayout.jsx";

const SCENARIOS = {
  "lead-routing": {
    label: {
      es: "Lead -> Calificación -> CRM -> Seguimiento",
      en: "Lead -> Qualification -> CRM -> Follow-up",
    },
    description: {
      es: "Captura un lead, valida datos, asigna prioridad y dispara seguimiento comercial.",
      en: "Capture a lead, validate data, assign priority, and trigger sales follow-up.",
    },
    steps: {
      es: [
        "Ingestar formulario del lead",
        "Validar correo y duplicados",
        "Calcular score comercial",
        "Crear oportunidad en CRM",
        "Enviar correo de seguimiento",
      ],
      en: [
        "Ingest lead form payload",
        "Validate email and duplicates",
        "Compute sales score",
        "Create CRM opportunity",
        "Send follow-up email",
      ],
    },
  },
  "invoice-recovery": {
    label: {
      es: "Factura vencida -> Recordatorio -> Escalación",
      en: "Overdue invoice -> Reminder -> Escalation",
    },
    description: {
      es: "Orquesta recuperación de cartera según días vencidos y prioridad del cliente.",
      en: "Orchestrates accounts receivable recovery by overdue days and client priority.",
    },
    steps: {
      es: [
        "Cargar factura pendiente",
        "Calcular nivel de riesgo",
        "Notificar por canal principal",
        "Escalar a asesor financiero",
      ],
      en: [
        "Load pending invoice",
        "Compute risk level",
        "Notify through primary channel",
        "Escalate to finance advisor",
      ],
    },
  },
  "support-triage": {
    label: {
      es: "Soporte B2B -> Clasificación -> SLA",
      en: "B2B support -> Classification -> SLA",
    },
    description: {
      es: "Clasifica tickets por impacto, asigna SLA y envía notificaciones al equipo adecuado.",
      en: "Classifies tickets by impact, assigns SLA, and notifies the right team.",
    },
    steps: {
      es: [
        "Recibir ticket de soporte",
        "Clasificar impacto y urgencia",
        "Asignar cola y responsable",
        "Notificar cliente con SLA",
      ],
      en: [
        "Receive support ticket",
        "Classify impact and urgency",
        "Assign queue and owner",
        "Notify customer with SLA",
      ],
    },
  },
};

const FLOW_COPY = {
  es: {
    title: "Demo | B2B Automation Flow Lab",
    subtitle:
      "Ejecuta escenarios de automatización en tiempo real. Este demo prioriza trazabilidad, validación y estados operativos.",
    scenario: "Escenario",
    leadName: "Contacto",
    email: "Correo",
    company: "Empresa",
    service: "Servicio",
    budget: "Presupuesto (USD)",
    invoiceId: "Factura",
    daysOverdue: "Días vencidos",
    ticketSummary: "Resumen de ticket",
    priority: "Prioridad",
    channel: "Canal",
    run: "Run flow",
    running: "Ejecutando...",
    seed: "Cargar datos demo",
    clear: "Limpiar logs",
    timeline: "Timeline de ejecución",
    result: "Resultado estructurado",
    progress: "Progreso",
    start: "Flujo iniciado.",
    completed: "Flujo finalizado correctamente.",
    invalidEmail: "Correo inválido. Ajusta el dato para continuar.",
    invalidBudget: "Presupuesto inválido. Debe ser mayor a 0.",
    invalidOverdue: "Días vencidos inválidos. Debe ser mayor a 0.",
    emptyLogs: "Aún no hay eventos. Ejecuta el flow para generar trazabilidad.",
    low: "Baja",
    medium: "Media",
    high: "Alta",
    emailChannel: "Email",
    whatsappChannel: "WhatsApp",
    slackChannel: "Slack",
  },
  en: {
    title: "Demo | B2B Automation Flow Lab",
    subtitle:
      "Run automation scenarios in real time. This demo focuses on traceability, validation, and operational states.",
    scenario: "Scenario",
    leadName: "Contact",
    email: "Email",
    company: "Company",
    service: "Service",
    budget: "Budget (USD)",
    invoiceId: "Invoice",
    daysOverdue: "Overdue days",
    ticketSummary: "Ticket summary",
    priority: "Priority",
    channel: "Channel",
    run: "Run flow",
    running: "Running...",
    seed: "Load demo data",
    clear: "Clear logs",
    timeline: "Execution timeline",
    result: "Structured result",
    progress: "Progress",
    start: "Flow started.",
    completed: "Flow completed successfully.",
    invalidEmail: "Invalid email. Update the value to continue.",
    invalidBudget: "Invalid budget. Must be greater than 0.",
    invalidOverdue: "Invalid overdue days. Must be greater than 0.",
    emptyLogs: "No events yet. Run the flow to generate traceability logs.",
    low: "Low",
    medium: "Medium",
    high: "High",
    emailChannel: "Email",
    whatsappChannel: "WhatsApp",
    slackChannel: "Slack",
  },
};

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function formatTime(value, locale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function buildSeedData(scenarioId) {
  if (scenarioId === "invoice-recovery") {
    return {
      contactName: "Laura Restrepo",
      email: "laura@contago.co",
      company: "ContaGO",
      serviceLine: "accounting-ops",
      budget: "4200",
      invoiceId: "INV-2026-009",
      daysOverdue: "21",
      ticketSummary: "",
      priority: "high",
      channel: "whatsapp",
    };
  }

  if (scenarioId === "support-triage") {
    return {
      contactName: "Nicolas Arias",
      email: "nicolas@opsbridge.io",
      company: "OpsBridge",
      serviceLine: "support",
      budget: "1800",
      invoiceId: "",
      daysOverdue: "",
      ticketSummary: "Reporting panel does not load for admin role.",
      priority: "medium",
      channel: "slack",
    };
  }

  return {
    contactName: "Camila Torres",
    email: "camila@madecore.co",
    company: "MadeCore",
    serviceLine: "web-app",
    budget: "6500",
    invoiceId: "",
    daysOverdue: "",
    ticketSummary: "",
    priority: "high",
    channel: "email",
  };
}

export default function DemoAutomation({ locale }) {
  const copy = FLOW_COPY[locale] ?? FLOW_COPY.es;
  const [scenarioId, setScenarioId] = useState("lead-routing");
  const [input, setInput] = useState(() => buildSeedData("lead-routing"));
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);

  const currentScenario = SCENARIOS[scenarioId];
  const scenarioOptions = useMemo(() => Object.entries(SCENARIOS), []);

  const pushLog = (level, message) => {
    setLogs((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
        level,
        message,
        at: new Date().toISOString(),
      },
    ]);
  };

  const handleRun = async () => {
    if (isRunning) return;

    const steps = currentScenario.steps[locale] ?? currentScenario.steps.es;
    const emailValid = /^\S+@\S+\.\S+$/.test(input.email.trim());

    if (!emailValid) {
      pushLog("error", copy.invalidEmail);
      return;
    }

    if (scenarioId === "lead-routing" && Number(input.budget) <= 0) {
      pushLog("error", copy.invalidBudget);
      return;
    }

    if (scenarioId === "invoice-recovery" && Number(input.daysOverdue) <= 0) {
      pushLog("error", copy.invalidOverdue);
      return;
    }

    setIsRunning(true);
    setLogs([]);
    setResult(null);
    setProgress(0);
    pushLog("info", copy.start);

    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];
      pushLog("info", `${index + 1}/${steps.length} - ${step}`);
      await wait(280 + index * 90);

      pushLog("success", `${step} ✓`);
      setProgress(Math.round(((index + 1) / steps.length) * 100));
    }

    const generatedResult =
      scenarioId === "lead-routing"
        ? {
            opportunityId: `OPP-${Math.floor(Math.random() * 9000 + 1000)}`,
            owner: Number(input.budget) >= 5000 ? "Enterprise Queue" : "Growth Queue",
            followUpChannel: input.channel,
            sla: "15m",
          }
        : scenarioId === "invoice-recovery"
          ? {
              invoice: input.invoiceId,
              riskTier: Number(input.daysOverdue) > 30 ? "critical" : "high",
              reminderChannel: input.channel,
              escalation: Number(input.daysOverdue) > 20,
            }
          : {
              ticketRef: `SUP-${Math.floor(Math.random() * 9000 + 1000)}`,
              assignedQueue: input.priority === "high" ? "on-call" : "support-core",
              sla: input.priority === "high" ? "30m" : "4h",
              notifiedVia: input.channel,
            };

    setResult(generatedResult);
    pushLog("success", copy.completed);
    setIsRunning(false);
  };

  const handleScenarioChange = (nextScenario) => {
    setScenarioId(nextScenario);
    setInput(buildSeedData(nextScenario));
    setLogs([]);
    setResult(null);
    setProgress(0);
  };

  const priorityLabel = {
    low: copy.low,
    medium: copy.medium,
    high: copy.high,
  };

  const channelLabel = {
    email: copy.emailChannel,
    whatsapp: copy.whatsappChannel,
    slack: copy.slackChannel,
  };

  return (
    <DemoLayout locale={locale} title={copy.title} subtitle={copy.subtitle} theme="automation">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 14 }}>
        <section className="card" style={{ gridColumn: "span 12", padding: 18 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>{copy.scenario}</span>
            <select
              className="demo-input"
              value={scenarioId}
              onChange={(event) => handleScenarioChange(event.target.value)}
            >
              {scenarioOptions.map(([id, scenario]) => (
                <option key={id} value={id}>
                  {scenario.label[locale] ?? scenario.label.es}
                </option>
              ))}
            </select>
          </label>

          <p style={{ margin: "8px 0 0", color: "var(--muted)", lineHeight: 1.7 }}>
            {currentScenario.description[locale] ?? currentScenario.description.es}
          </p>

          <div style={{ height: 12 }} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 10 }}>
            <label style={{ gridColumn: "span 12", display: "grid", gap: 6 }}>
              <span>{copy.leadName}</span>
              <input
                className="demo-input"
                value={input.contactName}
                onChange={(event) => setInput((current) => ({ ...current, contactName: event.target.value }))}
              />
            </label>

            <label style={{ gridColumn: "span 12", display: "grid", gap: 6 }}>
              <span>{copy.email}</span>
              <input
                className="demo-input"
                value={input.email}
                onChange={(event) => setInput((current) => ({ ...current, email: event.target.value }))}
              />
            </label>

            <label style={{ gridColumn: "span 12", display: "grid", gap: 6 }}>
              <span>{copy.company}</span>
              <input
                className="demo-input"
                value={input.company}
                onChange={(event) => setInput((current) => ({ ...current, company: event.target.value }))}
              />
            </label>

            <label style={{ gridColumn: "span 12", display: "grid", gap: 6 }}>
              <span>{copy.service}</span>
              <input
                className="demo-input"
                value={input.serviceLine}
                onChange={(event) => setInput((current) => ({ ...current, serviceLine: event.target.value }))}
              />
            </label>

            <label style={{ gridColumn: "span 12", display: "grid", gap: 6 }}>
              <span>{copy.budget}</span>
              <input
                className="demo-input"
                type="number"
                min="0"
                value={input.budget}
                onChange={(event) => setInput((current) => ({ ...current, budget: event.target.value }))}
              />
            </label>

            <label style={{ gridColumn: "span 12", display: "grid", gap: 6 }}>
              <span>{copy.invoiceId}</span>
              <input
                className="demo-input"
                value={input.invoiceId}
                onChange={(event) => setInput((current) => ({ ...current, invoiceId: event.target.value }))}
              />
            </label>

            <label style={{ gridColumn: "span 12", display: "grid", gap: 6 }}>
              <span>{copy.daysOverdue}</span>
              <input
                className="demo-input"
                type="number"
                min="0"
                value={input.daysOverdue}
                onChange={(event) => setInput((current) => ({ ...current, daysOverdue: event.target.value }))}
              />
            </label>

            <label style={{ gridColumn: "span 12", display: "grid", gap: 6 }}>
              <span>{copy.ticketSummary}</span>
              <textarea
                className="demo-input"
                rows={3}
                value={input.ticketSummary}
                onChange={(event) => setInput((current) => ({ ...current, ticketSummary: event.target.value }))}
              />
            </label>

            <label style={{ gridColumn: "span 12", display: "grid", gap: 6 }}>
              <span>{copy.priority}</span>
              <select
                className="demo-input"
                value={input.priority}
                onChange={(event) => setInput((current) => ({ ...current, priority: event.target.value }))}
              >
                <option value="low">{priorityLabel.low}</option>
                <option value="medium">{priorityLabel.medium}</option>
                <option value="high">{priorityLabel.high}</option>
              </select>
            </label>

            <label style={{ gridColumn: "span 12", display: "grid", gap: 6 }}>
              <span>{copy.channel}</span>
              <select
                className="demo-input"
                value={input.channel}
                onChange={(event) => setInput((current) => ({ ...current, channel: event.target.value }))}
              >
                <option value="email">{channelLabel.email}</option>
                <option value="whatsapp">{channelLabel.whatsapp}</option>
                <option value="slack">{channelLabel.slack}</option>
              </select>
            </label>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="btn" onClick={handleRun} disabled={isRunning}>
              {isRunning ? copy.running : copy.run}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setInput(buildSeedData(scenarioId))}>
              {copy.seed}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setLogs([]);
                setProgress(0);
                setResult(null);
              }}
            >
              {copy.clear}
            </button>
          </div>
        </section>

        <section className="card" style={{ gridColumn: "span 12", padding: 18 }}>
          <h2 style={{ margin: 0, fontSize: "clamp(1.15rem, 2.7vw, 1.4rem)" }}>{copy.timeline}</h2>
          <div style={{ marginTop: 8 }}>
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
                    "linear-gradient(90deg, color-mix(in srgb, var(--accent) 85%, #fff), color-mix(in srgb, var(--accent-2) 75%, #fff))",
                  transition: "width 220ms var(--ease)",
                }}
              />
            </div>
          </div>

          <div style={{ height: 10 }} />

          {logs.length === 0 ? (
            <p style={{ margin: 0, color: "var(--muted)" }}>{copy.emptyLogs}</p>
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

        {result ? (
          <section className="card" style={{ gridColumn: "span 12", padding: 18 }}>
            <h2 style={{ margin: 0, fontSize: "clamp(1.15rem, 2.7vw, 1.4rem)" }}>{copy.result}</h2>
            <pre className="demo-code-block">{JSON.stringify(result, null, 2)}</pre>
          </section>
        ) : null}
      </div>
    </DemoLayout>
  );
}
