import { useState } from "react";
import { useSesion } from "../sesion.js";
import { Aviso, Campo } from "../components/comunes.jsx";
import Logo from "../components/Logo.jsx";

export default function Login() {
  const { entrar } = useSesion();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (evento) => {
    evento.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      await entrar(correo, contrasena);
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="entrada">
      <form className="entrada__caja aparece" onSubmit={enviar}>
        <span className="panel__esquina tl" />
        <span className="panel__esquina tr" />
        <span className="panel__esquina bl" />
        <span className="panel__esquina br" />

        <Logo className="entrada__marca" />

        <h1 className="entrada__titulo">
          Cuentas <em>privadas</em>
        </h1>
        <p className="entrada__sub">Acceso solo para personas autorizadas.</p>

        {error && <Aviso tipo="error">{error}</Aviso>}

        <Campo etiqueta="Correo">
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            autoComplete="username"
            required
            autoFocus
          />
        </Campo>

        <Campo etiqueta="Contraseña">
          <input
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Campo>

        <button className="principal" type="submit" disabled={enviando} style={{ width: "100%" }}>
          {enviando ? "Entrando…" : "Entrar"}
          <span className="flecha">→</span>
        </button>
      </form>
    </div>
  );
}
