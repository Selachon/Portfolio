import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatLocalizedDateTime } from "../../app/dateTime.js";
import { getPath } from "../../app/paths.js";
import DemoLayout from "../../components/demo/DemoLayout.jsx";
import {
  clearDemoSession,
  loadDemoRoleWorkspace,
  loadDemoSession,
  requestDemoRolePermission,
  resetDemoRoleWorkspace,
  reviewDemoRoleRequest,
  setDemoRolePermission,
} from "../../data/demoStore.js";

const DASHBOARD_COPY = {
  es: {
    title: "Demo | Dashboard por roles",
    subtitle:
      "Espacio compartido entre Administrador y Usuario. Cambia de cuenta para ver como se solicitan, aprueban y aplican permisos.",
    noSession: "No hay sesion activa.",
    summary: "Resumen de sesion",
    role: "Rol",
    roleAdmin: "Administrador",
    roleUser: "Usuario",
    loginAt: "Inicio",
    signOut: "Cerrar sesion",
    workspace: "Permisos compartidos",
    workspaceHintAdmin: "Puedes activar permisos directamente o aprobar solicitudes pendientes.",
    workspaceHintUser: "Puedes solicitar permisos; el administrador decide si se aprueban.",
    queue: "Bandeja de aprobaciones",
    queueEmpty: "No hay solicitudes pendientes.",
    requestAccess: "Solicitar acceso",
    alreadyPending: "Ya existe una solicitud pendiente para esta accion.",
    alreadyGranted: "Ese permiso ya esta activo.",
    requestCreated: "Solicitud enviada al administrador.",
    approved: "Solicitud aprobada y permiso activado.",
    rejected: "Solicitud rechazada.",
    resetWorkspace: "Reiniciar espacio",
    runArea: "Acciones operativas",
    runNow: "Ejecutar",
    runBlocked: "Accion bloqueada por permisos de rol.",
    runSync: "Sincronizacion completada.",
    runReport: "Reporte generado y enviado al equipo.",
    runAudit: "Auditoria ejecutada sin incidentes.",
    compactHint: "Vista compacta para comparar roles sin scroll vertical.",
    panelQueue: "Aprobaciones",
    panelHistory: "Historial",
    panelActivity: "Actividad",
    history: "Historial compartido",
    historyEmpty: "No hay historial aun.",
    requestedBy: "Solicita",
    reviewedBy: "Revisa",
    statusPending: "Pendiente",
    statusApproved: "Aprobada",
    statusRejected: "Rechazada",
    actionSync: "Sincronizacion",
    actionReport: "Reportes",
    actionAudit: "Auditoria",
    actionSyncDesc: "Sincroniza datos operativos entre sistemas.",
    actionReportDesc: "Genera reportes ejecutivos del periodo.",
    actionAuditDesc: "Lanza validaciones de cumplimiento.",
    enablePermission: "Permitir",
    disablePermission: "Bloquear",
    approve: "Aprobar",
    reject: "Rechazar",
    activity: "Actividad actual",
    activityEmpty: "Sin actividad en esta sesion.",
  },
  en: {
    title: "Demo | Role-based dashboard",
    subtitle:
      "Shared workspace between Administrator and Standard User. Switch accounts to see how permissions are requested, approved, and applied.",
    noSession: "No active session.",
    summary: "Session summary",
    role: "Role",
    roleAdmin: "Administrator",
    roleUser: "Standard user",
    loginAt: "Login",
    signOut: "Sign out",
    workspace: "Shared permissions",
    workspaceHintAdmin: "You can enable permissions directly or approve pending requests.",
    workspaceHintUser: "You can request permissions; the administrator decides approval.",
    queue: "Approval queue",
    queueEmpty: "No pending requests.",
    requestAccess: "Request access",
    alreadyPending: "A pending request already exists for this action.",
    alreadyGranted: "This permission is already enabled.",
    requestCreated: "Request sent to administrator.",
    approved: "Request approved and permission enabled.",
    rejected: "Request rejected.",
    resetWorkspace: "Reset workspace",
    runArea: "Operational actions",
    runNow: "Run",
    runBlocked: "Action blocked by role permissions.",
    runSync: "Synchronization completed.",
    runReport: "Report generated and shared with the team.",
    runAudit: "Audit executed with no incidents.",
    compactHint: "Compact view to compare roles without vertical page scrolling.",
    panelQueue: "Approvals",
    panelHistory: "History",
    panelActivity: "Activity",
    history: "Shared history",
    historyEmpty: "No history yet.",
    requestedBy: "Requested by",
    reviewedBy: "Reviewed by",
    statusPending: "Pending",
    statusApproved: "Approved",
    statusRejected: "Rejected",
    actionSync: "Synchronization",
    actionReport: "Reports",
    actionAudit: "Audit",
    actionSyncDesc: "Sync operational data across systems.",
    actionReportDesc: "Generate executive period reports.",
    actionAuditDesc: "Run compliance validations.",
    enablePermission: "Allow",
    disablePermission: "Block",
    approve: "Approve",
    reject: "Reject",
    activity: "Current activity",
    activityEmpty: "No activity in this session.",
  },
};

const ACTIONS = [
  { id: "sync", key: "actionSync", descriptionKey: "actionSyncDesc", runKey: "runSync" },
  { id: "report", key: "actionReport", descriptionKey: "actionReportDesc", runKey: "runReport" },
  { id: "audit", key: "actionAudit", descriptionKey: "actionAuditDesc", runKey: "runAudit" },
];

function buildActivityId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
}

function getStatusCopy(copy, status) {
  if (status === "approved") return copy.statusApproved;
  if (status === "rejected") return copy.statusRejected;
  return copy.statusPending;
}

function getStatusClass(status) {
  if (status === "approved") return "demo-log-item--success";
  if (status === "rejected") return "demo-log-item--error";
  return "demo-log-item--info";
}

function getActionLabel(copy, actionId) {
  if (actionId === "sync") return copy.actionSync;
  if (actionId === "report") return copy.actionReport;
  return copy.actionAudit;
}

export default function DemoDashboard({ locale }) {
  const copy = DASHBOARD_COPY[locale] ?? DASHBOARD_COPY.es;
  const navigate = useNavigate();
  const redirectRef = useRef(false);
  const session = loadDemoSession();
  const [workspace, setWorkspace] = useState(() => loadDemoRoleWorkspace());
  const [activity, setActivity] = useState([]);
  const [activePanel, setActivePanel] = useState("queue");

  const isAdmin = session?.role === "Admin";
  const pendingRequests = useMemo(
    () => workspace.requests.filter((request) => request.status === "pending"),
    [workspace.requests],
  );
  const panelItemsLimit = 6;

  useEffect(() => {
    if (session || redirectRef.current) return;

    redirectRef.current = true;
    navigate(getPath("demoLogin", locale), { replace: true, state: { reason: copy.noSession } });
  }, [session, navigate, locale, copy.noSession]);

  if (!session) {
    return (
      <DemoLayout locale={locale} title={copy.title} subtitle={copy.subtitle} theme="auth">
        <div className="card" style={{ padding: 18 }}>
          <p style={{ margin: 0, color: "var(--muted)" }}>{copy.noSession}</p>
        </div>
      </DemoLayout>
    );
  }

  const pushActivity = (message, level = "info") => {
    setActivity((current) => [
      {
        id: buildActivityId(),
        message,
        level,
        at: new Date().toISOString(),
      },
      ...current,
    ]);
  };

  const handleSignOut = () => {
    clearDemoSession();
    navigate(getPath("demoLogin", locale), { replace: true });
  };

  const handleRequestAccess = (actionId) => {
    if (workspace.permissions[actionId]) {
      pushActivity(copy.alreadyGranted, "info");
      return;
    }

    const hasPending = workspace.requests.some((request) => request.action === actionId && request.status === "pending");
    if (hasPending) {
      pushActivity(copy.alreadyPending, "info");
      return;
    }

    const nextWorkspace = requestDemoRolePermission(actionId, session.email);
    setWorkspace(nextWorkspace);
    pushActivity(copy.requestCreated, "success");
  };

  const handleReview = (requestId, approved) => {
    const nextWorkspace = reviewDemoRoleRequest(requestId, session.email, approved);
    setWorkspace(nextWorkspace);
    pushActivity(approved ? copy.approved : copy.rejected, approved ? "success" : "error");
  };

  const handlePermissionToggle = (actionId, enabled) => {
    const nextWorkspace = setDemoRolePermission(actionId, enabled);
    setWorkspace(nextWorkspace);
    const actionLabel = getActionLabel(copy, actionId);
    const actionStateLabel = enabled ? copy.enablePermission : copy.disablePermission;
    pushActivity(`${actionStateLabel}: ${actionLabel}`, enabled ? "success" : "error");
  };

  const handleRunAction = (action) => {
    if (!isAdmin && !workspace.permissions[action.id]) {
      pushActivity(copy.runBlocked, "error");
      return;
    }

    pushActivity(copy[action.runKey], "success");
  };

  const handleResetWorkspace = () => {
    const nextWorkspace = resetDemoRoleWorkspace();
    setWorkspace(nextWorkspace);
    setActivity([]);
  };

  const queuePreview = pendingRequests.slice(0, panelItemsLimit);
  const historyPreview = workspace.requests.slice(0, panelItemsLimit);
  const activityPreview = activity.slice(0, panelItemsLimit);
  const panelOptions = [
    { id: "queue", label: copy.panelQueue, count: pendingRequests.length },
    { id: "history", label: copy.panelHistory, count: workspace.requests.length },
    { id: "activity", label: copy.panelActivity, count: activity.length },
  ];

  const activePanelTitle =
    activePanel === "queue" ? copy.queue : activePanel === "history" ? copy.history : copy.activity;

  const activePanelTotal =
    activePanel === "queue"
      ? pendingRequests.length
      : activePanel === "history"
        ? workspace.requests.length
        : activity.length;

  const hiddenPanelItems = Math.max(0, activePanelTotal - panelItemsLimit);

  return (
    <DemoLayout locale={locale} title={copy.title} subtitle={copy.subtitle} theme="auth">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 14, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 14 }}>
          <section className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "clamp(1.08rem, 2.35vw, 1.28rem)" }}>{copy.summary}</h2>
                <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.55 }}>{copy.compactHint}</p>
              </div>

              <div style={{ display: "grid", gap: 6, minWidth: 220 }}>
                <div className="pill" style={{ width: "fit-content" }}>{session.email}</div>
                <small style={{ color: "var(--muted)" }}>
                  <strong>{copy.role}:</strong> {isAdmin ? copy.roleAdmin : copy.roleUser}
                </small>
                <small style={{ color: "var(--muted)" }}>
                  <strong>{copy.loginAt}:</strong> {formatLocalizedDateTime(session.loginAt, locale)}
                </small>
              </div>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-ghost" type="button" onClick={handleSignOut}>
                {copy.signOut}
              </button>
              {isAdmin ? (
                <button type="button" className="btn btn-ghost" onClick={handleResetWorkspace}>
                  {copy.resetWorkspace}
                </button>
              ) : null}
            </div>
          </section>

          <section className="card" style={{ padding: 16 }}>
            <h2 style={{ margin: 0, fontSize: "clamp(1.08rem, 2.35vw, 1.28rem)" }}>{copy.workspace}</h2>
            <p style={{ margin: "8px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
              {isAdmin ? copy.workspaceHintAdmin : copy.workspaceHintUser}
            </p>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gap: 10,
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              }}
            >
              {ACTIONS.map((action) => {
                const isEnabled = workspace.permissions[action.id];
                const actionLabel = getActionLabel(copy, action.id);

                return (
                  <article
                    key={action.id}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "10px 12px",
                      display: "grid",
                      gap: 8,
                      background: "color-mix(in srgb, var(--bg-elev) 90%, transparent)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <strong>{actionLabel}</strong>
                      <span className="pill" style={{ width: "fit-content" }}>
                        {isEnabled ? copy.enablePermission : copy.disablePermission}
                      </span>
                    </div>

                    <small style={{ color: "var(--muted)", lineHeight: 1.55 }}>{copy[action.descriptionKey]}</small>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" className="btn btn-ghost" onClick={() => handleRunAction(action)}>
                        {copy.runNow}
                      </button>

                      {isAdmin ? (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => handlePermissionToggle(action.id, !isEnabled)}
                        >
                          {isEnabled ? copy.disablePermission : copy.enablePermission}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => handleRequestAccess(action.id)}
                          disabled={isEnabled}
                        >
                          {copy.requestAccess}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <section className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: "clamp(1.08rem, 2.35vw, 1.28rem)" }}>{activePanelTitle}</h2>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {panelOptions.map((panel) => (
                <button
                  key={panel.id}
                  type="button"
                  className={activePanel === panel.id ? "btn" : "btn btn-ghost"}
                  onClick={() => setActivePanel(panel.id)}
                  style={{ padding: "7px 10px" }}
                >
                  {panel.label} ({panel.count})
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: 10 }} />

          <div style={{ display: "grid", gap: 8, maxHeight: "52vh", overflowY: "auto", paddingRight: 2 }}>
            {activePanel === "queue" ? (
              queuePreview.length === 0 ? (
                <p style={{ margin: 0, color: "var(--muted)" }}>{copy.queueEmpty}</p>
              ) : (
                queuePreview.map((request) => (
                  <div key={request.id} className="demo-log-item demo-log-item--info">
                    <div style={{ display: "grid", gap: 2 }}>
                      <strong>{getActionLabel(copy, request.action)}</strong>
                      <small>
                        {copy.requestedBy}: {request.requestedBy}
                      </small>
                    </div>

                    {isAdmin ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" className="btn btn-ghost" onClick={() => handleReview(request.id, true)}>
                          {copy.approve}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => handleReview(request.id, false)}>
                          {copy.reject}
                        </button>
                      </div>
                    ) : (
                      <span className="pill" style={{ width: "fit-content" }}>
                        {copy.statusPending}
                      </span>
                    )}
                  </div>
                ))
              )
            ) : null}

            {activePanel === "history" ? (
              historyPreview.length === 0 ? (
                <p style={{ margin: 0, color: "var(--muted)" }}>{copy.historyEmpty}</p>
              ) : (
                historyPreview.map((request) => (
                  <div key={request.id} className={`demo-log-item ${getStatusClass(request.status)}`}>
                    <div style={{ display: "grid", gap: 2 }}>
                      <strong>{getActionLabel(copy, request.action)}</strong>
                      <small>
                        {copy.requestedBy}: {request.requestedBy} - {formatLocalizedDateTime(request.requestedAt, locale)}
                      </small>
                      {request.reviewedBy ? (
                        <small>
                          {copy.reviewedBy}: {request.reviewedBy}
                          {request.reviewedAt ? ` - ${formatLocalizedDateTime(request.reviewedAt, locale)}` : ""}
                        </small>
                      ) : null}
                    </div>

                    <span className="pill" style={{ width: "fit-content" }}>
                      {getStatusCopy(copy, request.status)}
                    </span>
                  </div>
                ))
              )
            ) : null}

            {activePanel === "activity" ? (
              activityPreview.length === 0 ? (
                <p style={{ margin: 0, color: "var(--muted)" }}>{copy.activityEmpty}</p>
              ) : (
                activityPreview.map((entry) => (
                  <div key={entry.id} className={`demo-log-item demo-log-item--${entry.level}`}>
                    <span>{entry.message}</span>
                    <small style={{ color: "var(--muted)" }}>{formatLocalizedDateTime(entry.at, locale)}</small>
                  </div>
                ))
              )
            ) : null}
          </div>

          {hiddenPanelItems > 0 ? (
            <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 13 }}>+{hiddenPanelItems}</p>
          ) : null}
        </section>
      </div>
    </DemoLayout>
  );
}
