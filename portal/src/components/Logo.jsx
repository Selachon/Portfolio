// El logotipo de Kora, en su versión para fondo oscuro o para fondo claro.
//
// Son dos archivos y no un filtro CSS: invertir el original le cambiaba el rosa
// de la marca por un granate que no es de Kora. La variante clara conserva el
// matiz exacto y solo baja la luminosidad.

export default function Logo({ className = "" }) {
  return (
    <>
      <img className={`solo-oscuro ${className}`.trim()} src="/marca/kora-logo.png" alt="Kora" />
      <img
        className={`solo-claro ${className}`.trim()}
        src="/marca/kora-logo-claro.png"
        alt="Kora"
        aria-hidden="true"
      />
    </>
  );
}
