// Sesión del portal.
//
// El servidor es la única fuente de verdad: aquí solo se guarda lo que él
// responde. No hay ningún token en localStorage, a propósito — la sesión vive
// en una cookie HttpOnly que el JavaScript de la página no puede leer.

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import { ContextoSesion } from "./sesion.js";

export function ProveedorSesion({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  const refrescar = useCallback(async () => {
    try {
      const { usuario: actual } = await api.get("/api/sesion/estado");
      setUsuario(actual);
    } catch {
      setUsuario(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    refrescar();
  }, [refrescar]);

  const valor = useMemo(
    () => ({
      usuario,
      cargando,
      esPropietario: usuario?.rol === "owner",
      async entrar(correo, contrasena) {
        const { usuario: nuevo } = await api.post("/api/sesion/entrar", { correo, contrasena });
        setUsuario(nuevo);
        return nuevo;
      },
      async salir() {
        await api.post("/api/sesion/salir");
        setUsuario(null);
      },
      async cambiarContrasena(actual, nueva) {
        await api.post("/api/sesion/contrasena", { actual, nueva });
        await refrescar();
      },
      refrescar,
    }),
    [usuario, cargando, refrescar],
  );

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}
