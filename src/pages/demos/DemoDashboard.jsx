import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DemoLayout from "../../components/demo/DemoLayout.jsx";
import { clearDemoSession, loadDemoSession } from "../../data/demoStore.js";

const DASHBOARD_COPY = {
  es: {
    title: "Demo | Dashboard protegido",
    subtitle: "Vista protegida por sesión demo. Sirve para validar flujo de acceso y estados de operación.",
    noSession: "No hay sesión activa.",
    summary: "Resumen de sesión",
    role: "Rol",
    loginAt: "Inicio",
    modules: "Módulos habilitados",
    activity: "Actividad simulada",
    runSync: "Ejecutar sincronización",
    runReport: "Generar reporte",
    runAudit: "Disparar auditoría",
    signOut: "Cerrar sesión",
    activityEmpty: "Todavía no hay actividad. Ejecuta alguna acción para poblar el timeline.",
    syncDone: "Sincronización completada con éxito.",
    reportDone: "Reporte operativo generado y archivado.",
    auditDone: "Auditoría finalizada sin incidencias críticas.",
  },
  en: {
    title: "Demo | Protected dashboard",
    subtitle: "Session-protected view used to validate auth flow and operational states.",
    noSession: "No active session.",
    summary: "Session summary",
    role: "Role",
    loginAt: "Login",
    modules: "Enabled modules",
    activity: "Simulated activity",
    runSync: "Run synchronization",
    runReport: "Generate report",
    runAudit: "Trigger audit",
    signOut: "Sign out",
    activityEmpty: "No activity yet. Run any action to populate the timeline.",
    syncDone: "Synchronization completed successfully.",
    reportDone: "Operational report generated and archived.",
    auditDone: "Audit completed with no critical incidents.",
  },
};

const MODULES = [
  { id: "contacts", label: { es: "Contactos", en: "Contacts" } },
  { id: "deals", label: { es: "Oportunidades", en: "Opportunities" } },
  { id: "billing", label: { es: "Facturación", en: "Billing" } },
  { id: "notifications", label: { es: "Notificaciones", en: "Notifications" } },
];

function formatDate(value, locale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function DemoDashboard({ locale }) {
  const copy = DASHBOARD_COPY[locale] ?? DASHBOARD_COPY.es;
  const navigate = useNavigate();
  const redirectRef = useRef(false);
  const session = loadDemoSession();
  const [moduleState, setModuleState] = useState({
    contacts: true,
    deals: true,
    billing: false,
    notifications: true,
  });
  const [activity, setActivity] = useState([]);

  const activeModules = useMemo(
    () => MODULES.filter((module) => moduleState[module.id]),
    [moduleState],
  );

  useEffect(() => {
    if (session || redirectRef.current) return;

    redirectRef.current = true;
    navigate("/demos/login", { replace: true, state: { reason: copy.noSession } });
  }, [session, navigate, copy.noSession]);

  if (!session) {
    return (
      <DemoLayout locale={locale} title={copy.title} subtitle={copy.subtitle} theme="auth">
        <div className="card" style={{ padding: 18 }}>
          <p style={{ margin: 0, color: "var(--muted)" }}>{copy.noSession}</p>
        </div>
      </DemoLayout>
    );
  }

  const pushActivity = (message) => {
    setActivity((current) => [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
        message,
        at: new Date().toISOString(),
      },
      ...current,
    ]);
  };

  const handleSignOut = () => {
    clearDemoSession();
    navigate("/demos/login", { replace: true });
  };

  return (
    <DemoLayout locale={locale} title={copy.title} subtitle={copy.subtitle} theme="auth">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 14 }}>
        <section className="card" style={{ gridColumn: "span 12", padding: 18 }}>
          <h2 style={{ margin: 0, fontSize: "clamp(1.15rem, 2.7vw, 1.4rem)" }}>{copy.summary}</h2>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            <div className="pill" style={{ width: "fit-content" }}>{session.email}</div>
            <div style={{ color: "var(--muted)" }}>
              <strong>{copy.role}:</strong> {session.role}
            </div>
            <div style={{ color: "var(--muted)" }}>
              <strong>{copy.loginAt}:</strong> {formatDate(session.loginAt, locale)}
            </div>
          </div>

          <div style={{ height: 12 }} />

          <button className="btn btn-ghost" type="button" onClick={handleSignOut}>
            {copy.signOut}
          </button>
        </section>

        <section className="card" style={{ gridColumn: "span 12", padding: 18 }}>
          <h2 style={{ margin: 0, fontSize: "clamp(1.15rem, 2.7vw, 1.4rem)" }}>{copy.modules}</h2>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {MODULES.map((module) => (
              <label key={module.id} className="pill" style={{ width: "fit-content", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={moduleState[module.id]}
                  onChange={(event) =>
                    setModuleState((current) => ({
                      ...current,
                      [module.id]: event.target.checked,
                    }))
                  }
                />
                <span>{module.label[locale] ?? module.label.es}</span>
              </label>
            ))}
          </div>

          <p style={{ margin: "12px 0 0", color: "var(--muted)", lineHeight: 1.7 }}>
            {activeModules.length} / {MODULES.length}
          </p>
        </section>

        <section className="card" style={{ gridColumn: "span 12", padding: 18 }}>
          <h2 style={{ margin: 0, fontSize: "clamp(1.15rem, 2.7vw, 1.4rem)" }}>{copy.activity}</h2>

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-ghost" onClick={() => pushActivity(copy.syncDone)}>
              {copy.runSync}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => pushActivity(copy.reportDone)}>
              {copy.runReport}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => pushActivity(copy.auditDone)}>
              {copy.runAudit}
            </button>
          </div>

          <div style={{ height: 10 }} />

          {activity.length === 0 ? (
            <p style={{ margin: 0, color: "var(--muted)" }}>{copy.activityEmpty}</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {activity.map((entry) => (
                <div key={entry.id} className="pill" style={{ justifyContent: "space-between", gap: 12 }}>
                  <span>{entry.message}</span>
                  <small style={{ color: "var(--muted)" }}>{formatDate(entry.at, locale)}</small>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </DemoLayout>
  );
}
