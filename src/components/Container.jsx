// Componente contenedor que proporciona layout consistente a las páginas
export default function Container({ children }) {
  return (
    <div style={{ maxWidth: "var(--max)", margin: "0 auto", padding: "22px 18px" }}>
      {children}
    </div>
  );
}
