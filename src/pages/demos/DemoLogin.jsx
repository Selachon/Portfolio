import { useEffect, useState } from "react";
import DemoReturn from "../../components/demo/DemoReturn.jsx";

/* DEMO 2 · AUTH — skin "Aurora" (bright modern SaaS) */
export default function DemoLogin({ locale }) {
  const STORAGE_KEY = "kora.demo.auth";
  const ACCOUNTS = {
    "admin@korabysela.dev": { pw: "kora-admin-2026", role: "admin", name: "Sela", initials: "S" },
    "user@korabysela.dev": { pw: "kora-user-2026", role: "user", name: "Demo User", initials: "D" },
  };

  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
  });
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(null);

  useEffect(() => {
    try {
      if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      else localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  }, [session]);

  const submit = (e) => {
    e.preventDefault();
    const acct = ACCOUNTS[email.trim().toLowerCase()];
    if (!acct || acct.pw !== pw) {
      setErr(locale === "es" ? "Credenciales inválidas." : "Invalid credentials.");
      return;
    }
    setSession({ email: email.trim().toLowerCase(), role: acct.role, name: acct.name, initials: acct.initials });
    setErr(null);
    setEmail("");
    setPw("");
  };
  const fill = (e) => { setEmail(e); setPw(ACCOUNTS[e].pw); setErr(null); };

  const TILES = [
    { t: locale === "es" ? "Mi perfil" : "My profile", d: locale === "es" ? "Datos de tu cuenta." : "Your account details.", ic: "◓", c: "#5B4BE8", admin: false },
    { t: locale === "es" ? "Mis tareas" : "My tasks", d: locale === "es" ? "Trabajo asignado." : "Assigned work.", ic: "✓", c: "#0E9F6E", admin: false },
    { t: locale === "es" ? "Soporte" : "Support", d: locale === "es" ? "Centro de ayuda." : "Help center.", ic: "◍", c: "#0EA5E9", admin: false },
    { t: locale === "es" ? "Administración" : "Administration", d: locale === "es" ? "Gestión de usuarios." : "User management.", ic: "⚙", c: "#9333EA", admin: true },
    { t: locale === "es" ? "Configuración" : "Configuration", d: locale === "es" ? "Ajustes del sistema." : "System settings.", ic: "▤", c: "#E11D48", admin: true },
    { t: locale === "es" ? "Logs del sistema" : "System logs", d: locale === "es" ? "Auditoría completa." : "Full audit trail.", ic: "≣", c: "#F59E0B", admin: true },
  ];

  return (
    <div className="page-demo fade-in">
      <DemoReturn locale={locale} n="02" name={locale === "es" ? "AUTH POR ROLES" : "ROLE AUTH"} styleName="Aurora — SaaS" />
      <div className="skin-aurora">
        <div className="au-shell">
          {!session ? (
            <div className="au-login">
              <form className="au-card" onSubmit={submit}>
                <div className="au-eyebrow">Aurora ID</div>
                <h2 className="au-h">{locale === "es" ? "Bienvenido de vuelta" : "Welcome back"}</h2>
                <p className="au-sub">{locale === "es" ? "Inicia sesión para ver el acceso por rol." : "Sign in to see role-scoped access."}</p>
                <label className="au-field">
                  <span className="au-field__lbl">Email</span>
                  <input className="au-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
                </label>
                <label className="au-field">
                  <span className="au-field__lbl">{locale === "es" ? "Contraseña" : "Password"}</span>
                  <input className="au-input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••••" required />
                </label>
                {err && <p className="au-err">⚠ {err}</p>}
                <button className="au-btn" type="submit">{locale === "es" ? "Iniciar sesión" : "Sign in"} →</button>
              </form>
              <div className="au-aside">
                <div className="au-asidecard">
                  <div className="au-eyebrow">{locale === "es" ? "Cuentas demo" : "Demo accounts"}</div>
                  <p className="au-hint" style={{ marginBottom: 16 }}>{locale === "es" ? "Toca una para autocompletar:" : "Tap one to autofill:"}</p>
                  {Object.entries(ACCOUNTS).map(([e, a]) => (
                    <button key={e} type="button" className="au-acct" onClick={() => fill(e)}>
                      <span
                        className="au-acct__av"
                        style={{ background: a.role === "admin" ? "linear-gradient(135deg,#5B4BE8,#9333EA)" : "linear-gradient(135deg,#0E9F6E,#0EA5E9)" }}
                      >
                        {a.initials}
                      </span>
                      <span>
                        <span className="au-acct__e">{e}</span><br />
                        <span className="au-acct__r">{a.role === "admin" ? (locale === "es" ? "Acceso total" : "Full access") : (locale === "es" ? "Acceso limitado" : "Limited access")}</span>
                      </span>
                    </button>
                  ))}
                  <p className="au-hint">{locale === "es" ? "Sin backend — simulación local." : "No backend — local simulation."}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="au-app">
              <div className="au-topbar">
                <div className="au-user">
                  <span className="au-user__av">{session.initials}</span>
                  <div>
                    <div className="au-user__n">{session.name}</div>
                    <span className={"au-rolepill" + (session.role === "user" ? " user" : "")}>{session.role}</span>
                  </div>
                </div>
                <button className="au-signout" onClick={() => setSession(null)}>{locale === "es" ? "Cerrar sesión" : "Sign out"}</button>
              </div>
              <div className="au-tiles">
                {TILES.map((tile) => {
                  const ok = !tile.admin || session.role === "admin";
                  return (
                    <div key={tile.t} className={"au-tile " + (ok ? "ok" : "locked")}>
                      <div className="au-tile__ic" style={{ background: ok ? `${tile.c}1f` : "#E5E7EB", color: ok ? tile.c : "#9CA3AF" }}>{ok ? tile.ic : "🔒"}</div>
                      <h3 className="au-tile__t">{tile.t}</h3>
                      <p className="au-tile__d">{tile.d}</p>
                      <span className="au-tile__badge">{ok ? (locale === "es" ? "● Disponible" : "● Available") : (locale === "es" ? "Solo admin" : "Admin only")}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
