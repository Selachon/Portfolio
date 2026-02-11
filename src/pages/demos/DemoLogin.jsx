import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DemoLayout from "../../components/demo/DemoLayout.jsx";
import {
  DEMO_AUTH_CREDENTIALS,
  clearDemoSession,
  createDemoSession,
  loadDemoSession,
  saveDemoSession,
  validateDemoCredentials,
} from "../../data/demoStore.js";

const LOGIN_COPY = {
  es: {
    title: "Demo | Login",
    subtitle:
      "Flujo de autenticación demo: acceso, persistencia de sesión y transición a dashboard protegido.",
    credentialsTitle: "Credenciales demo",
    credentialsHelper: "Puedes usarlas para probar el flujo completo.",
    email: "Correo",
    password: "Contraseña",
    signIn: "Iniciar sesión",
    sessionActive: "Sesión activa",
    sessionActiveText: "Ya hay una sesión demo iniciada en este navegador.",
    openDashboard: "Ir al dashboard",
    closeSession: "Cerrar sesión",
    invalid: "Credenciales inválidas para esta demo.",
    note: "Este acceso es simulado y no usa backend real.",
  },
  en: {
    title: "Demo | Login",
    subtitle:
      "Demo authentication flow: sign-in, persistent session, and navigation to a protected dashboard.",
    credentialsTitle: "Demo credentials",
    credentialsHelper: "Use these values to test the full flow.",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    sessionActive: "Session active",
    sessionActiveText: "A demo session is already active in this browser.",
    openDashboard: "Open dashboard",
    closeSession: "Sign out",
    invalid: "Invalid credentials for this demo.",
    note: "This access is simulated and does not use a real backend.",
  },
};

export default function DemoLogin({ locale }) {
  const copy = LOGIN_COPY[locale] ?? LOGIN_COPY.es;
  const navigate = useNavigate();
  const [session, setSession] = useState(() => loadDemoSession());
  const [email, setEmail] = useState(DEMO_AUTH_CREDENTIALS.email);
  const [password, setPassword] = useState(DEMO_AUTH_CREDENTIALS.password);
  const [error, setError] = useState("");

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
    navigate("/demos/dashboard");
  };

  const handleSignOut = () => {
    clearDemoSession();
    setSession(null);
  };

  return (
    <DemoLayout locale={locale} title={copy.title} subtitle={copy.subtitle} theme="auth">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 14 }}>
        <section className="card" style={{ gridColumn: "span 12", padding: 18 }}>
          <h2 style={{ margin: 0, fontSize: "clamp(1.15rem, 2.6vw, 1.4rem)" }}>{copy.credentialsTitle}</h2>
          <p style={{ margin: "8px 0 0", color: "var(--muted)", lineHeight: 1.7 }}>{copy.credentialsHelper}</p>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            <div className="pill" style={{ width: "fit-content" }}>
              <strong>{copy.email}:</strong> {DEMO_AUTH_CREDENTIALS.email}
            </div>
            <div className="pill" style={{ width: "fit-content" }}>
              <strong>{copy.password}:</strong> {DEMO_AUTH_CREDENTIALS.password}
            </div>
          </div>

          <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 14 }}>{copy.note}</p>
        </section>

        <section className="card" style={{ gridColumn: "span 12", padding: 18 }}>
          {session ? (
            <>
              <h2 style={{ margin: 0, fontSize: "clamp(1.15rem, 2.6vw, 1.4rem)" }}>{copy.sessionActive}</h2>
              <p style={{ margin: "8px 0 0", color: "var(--muted)", lineHeight: 1.7 }}>{copy.sessionActiveText}</p>
              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link className="btn" to="/demos/dashboard">
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

              {error ? <p style={{ margin: "4px 0 0", color: "#ef4444" }}>{error}</p> : null}

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
