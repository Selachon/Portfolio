// Tema claro/oscuro, con la misma mecánica que el sitio público: un atributo
// en <html> y la preferencia guardada. Se lee antes del primer render para que
// nadie vea un destello del tema equivocado.

const CLAVE = "kora.portal.tema";

function guardado() {
  try {
    return window.localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

export function temaInicial() {
  const previo = guardado();
  if (previo === "claro" || previo === "oscuro") return previo;

  const prefiereClaro =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: light)").matches;

  return prefiereClaro ? "claro" : "oscuro";
}

export function aplicarTema(tema) {
  document.documentElement.dataset.theme = tema === "claro" ? "light" : "dark";

  try {
    window.localStorage.setItem(CLAVE, tema);
  } catch {
    // Navegar en privado no debería romper el portal.
  }
}
