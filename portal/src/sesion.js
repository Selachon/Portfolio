// Contexto de sesión. Separado del proveedor para que el recargado en caliente
// de React siga funcionando durante el desarrollo.

import { createContext, useContext } from "react";

export const ContextoSesion = createContext(null);

export function useSesion() {
  const contexto = useContext(ContextoSesion);
  if (!contexto) throw new Error("useSesion tiene que usarse dentro de ProveedorSesion.");
  return contexto;
}
