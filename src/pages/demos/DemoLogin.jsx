import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DemoLayout from "../../components/demo/DemoLayout.jsx";
import { getPath } from "../../app/paths.js";
import {
  clearDemoSession,
  createDemoSession,
  getDemoAuthUsers,
  loadDemoSession,
  saveDemoSession,
  validateDemoCredentials,
} from "../../data/demoStore.js";

const LOGIN_COPY = {
  es: {
    title: "Demo | Login",
    subtitle:
      "Flujo de autenticacion demo con 2 perfiles: Administrador y Usuario. Prueba intercambio de roles para ver permisos reales.",
    credentialsTitle: "Cuentas demo",
    credentialsHelper: "Estas cuentas comparten el mismo espacio de trabajo para simular aprobaciones por rol.",
    accessRequired: "Acceso requerido",
    email: "Correo",
    password: "Contrasena",
    signIn: "Iniciar sesion",
    useAccount: "Usar cuenta",
    role: "Rol",
    roleAdmin: "Administrador",
    roleUser: "Usuario",
    accountAdminHint: "Puede aprobar solicitudes y gestionar permisos.",
    accountUserHint: "Puede solicitar permisos y operar segun autorizaciones.",
    sessionActive: "Sesion activa",
    sessionActiveText: "Ya hay una sesion demo iniciada en este navegador.",
    openDashboard: "Ir al dashboard",
    closeSession: "Cerrar sesion",
    invalid: "Credenciales invalidas para esta demo.",
    note: "Acceso simulado, sin backend real.",
  },
  en: {
    title: "Demo | Login",
    subtitle:
      "Demo auth flow with 2 profiles: Administrator and Standard User. Switch roles to test real permission boundaries.",
    credentialsTitle: "Demo accounts",
    credentialsHelper: "Both accounts share the same workspace to simulate role-based approvals.",
    accessRequired: "Access required",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    useAccount: "Use account",
    role: "Role",
    roleAdmin: "Administrator",
    roleUser: "Standard user",
    accountAdminHint: "Can approve requests and manage permissions.",
    accountUserHint: "Can request permissions and operate within approvals.",
    sessionActive: "Session active",
    sessionActiveText: "A demo session is already active in this browser.",
    openDashboard: "Open dashboard",
    closeSession: "Sign out",
    invalid: "Invalid credentials for this demo.",
    note: "Simulated access, no real backend.",
  },
};

function getRoleLabel(copy, role) {
  return role === "Admin" ? copy.roleAdmin : copy.roleUser;
}

export default function DemoLogin({ locale }) {
  const copy = LOGIN_COPY[locale] ?? LOGIN_COPY.es;
  const location = useLocation();
  const navigate = useNavigate();
  const accounts = useMemo(() => getDemoAuthUsers(), []);
  const defaultAccount = accounts[0] ?? { id: "", email: "", password: "", role: "User", name: "Demo User" };
  const [session, setSession] = useState(() => loadDemoSession());
  const [email, setEmail] = useState(defaultAccount.email);
  const [password, setPassword] = useState(defaultAccount.password);
  const [selectedAccountId, setSelectedAccountId] = useState(defaultAccount.id);
  const [error, setError] = useState("");

  const reason = typeof location.state?.reason === "string" ? location.state.reason : "";

  const applyAccount = (account) => {
    setSelectedAccountId(account.id);
    setEmail(account.email);
    setPassword(account.password);
    setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validateDemoCredentials(email, password)) {
      setError(copy.invalid);
      return;
    }

    const nextSession = createDemoSession(email.trim().toLowerCase());
    saveDemoSession(nextSession);
    setSession(nextSession);
    setError("");
    navigate(getPath("demoDashboard", locale));
  };

  const handleSignOut = () => {
    clearDemoSession();
    setSession(null);
  };

  return (
    <DemoLayout locale={locale} title={copy.title} subtitle={copy.subtitle} theme="auth">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 14 }}>
        {reason ? (
          <section className="card" style={{ gridColumn: "span 12", padding: 18 }}>
            <strong>{copy.accessRequired}</strong>
            <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>{reason}</p>
          </section>
        ) : null}

        <section className="card" style={{ gridColumn: "span 12", padding: 18 }}>
          <h2 style={{ margin: 0, fontSize: "clamp(1.15rem, 2.6vw, 1.4rem)" }}>{copy.credentialsTitle}</h2>
          <p style={{ margin: "8px 0 0", color: "var(--muted)", lineHeight: 1.7 }}>{copy.credentialsHelper}</p>

          <div
            style={{
              marginTop: 10,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 10,
              alignItems: "start",
            }}
          >
            {accounts.map((account) => {
              const isAdmin = account.role === "Admin";

              return (
                <article
                  key={account.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    background:
                      selectedAccountId === account.id
                        ? "color-mix(in srgb, var(--accent-soft) 40%, var(--bg-elev))"
                        : "color-mix(in srgb, var(--bg-elev) 90%, transparent)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <strong>{account.name}</strong>
                    <span className="pill" style={{ width: "fit-content" }}>
                      {copy.role}: {getRoleLabel(copy, account.role)}
                    </span>
                  </div>

                  <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                    <div className="pill" style={{ width: "fit-content" }}>
                      <strong>{copy.email}:</strong> {account.email}
                    </div>
                    <div className="pill" style={{ width: "fit-content" }}>
                      <strong>{copy.password}:</strong> {account.password}
                    </div>
                  </div>

                  <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 14 }}>
                    {isAdmin ? copy.accountAdminHint : copy.accountUserHint}
                  </p>

                  <div style={{ marginTop: 10 }}>
                    <button type="button" className="btn btn-ghost" onClick={() => applyAccount(account)}>
                      {copy.useAccount}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 14 }}>{copy.note}</p>
        </section>

        <section className="card" style={{ gridColumn: "span 12", padding: 18 }}>
          {session ? (
            <>
              <h2 style={{ margin: 0, fontSize: "clamp(1.15rem, 2.6vw, 1.4rem)" }}>{copy.sessionActive}</h2>
              <p style={{ margin: "8px 0 0", color: "var(--muted)", lineHeight: 1.7 }}>{copy.sessionActiveText}</p>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div className="pill" style={{ width: "fit-content" }}>
                  {session.email}
                </div>
                <div style={{ color: "var(--muted)" }}>
                  <strong>{copy.role}:</strong> {getRoleLabel(copy, session.role)}
                </div>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link className="btn" to={getPath("demoDashboard", locale)}>
                  {copy.openDashboard}
                </Link>
                <button type="button" className="btn btn-ghost" onClick={handleSignOut}>
                  {copy.closeSession}
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>{copy.email}</span>
                <input
                  className="demo-input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>{copy.password}</span>
                <input
                  className="demo-input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>

              {error ? <p style={{ margin: "4px 0 0", color: "var(--danger)" }}>{error}</p> : null}

              <div>
                <button className="btn" type="submit">
                  {copy.signIn}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </DemoLayout>
  );
}
