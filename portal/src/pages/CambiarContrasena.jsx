// Pantalla obligatoria cuando se entra con una contraseña temporal.
// El servidor bloquea el resto del portal hasta que se cambie.

import { useState } from "react";
import { useSesion } from "../sesion.js";
import { Aviso, Campo } from "../components/comunes.jsx";
import Logo from "../components/Logo.jsx";

export default function CambiarContrasena() {
  const { cambiarContrasena, salir } = useSesion();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (evento) => {
    evento.preventDefault();
    setError(null);

    if (nueva !== repetida) {
      setError("Las dos contraseñas nuevas no coinciden.");
      return;
    }

    setEnviando(true);
    try {
      await cambiarContrasena(actual, nueva);
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
          Elige tu <em>contraseña</em>
        </h1>
        <p className="entrada__sub">
          Entraste con una contraseña temporal. Cámbiala para poder usar el portal.
        </p>

        {error && <Aviso tipo="error">{error}</Aviso>}

        <Campo etiqueta="Contraseña temporal">
          <input
            type="password"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            autoComplete="current-password"
            required
            autoFocus
          />
        </Campo>

        <Campo etiqueta="Contraseña nueva (mínimo 12 caracteres, con letras y números)">
          <input
            type="password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            autoComplete="new-password"
            minLength={12}
            required
          />
        </Campo>

        <Campo etiqueta="Repite la contraseña nueva">
          <input
            type="password"
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Campo>

        <div className="acciones">
          <button className="principal" type="submit" disabled={enviando}>
            {enviando ? "Guardando…" : "Guardar y entrar"}
            <span className="flecha">→</span>
          </button>
          <button type="button" className="discreto" onClick={salir}>
            Salir
          </button>
        </div>
      </form>
    </div>
  );
}
