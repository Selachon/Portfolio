import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { ProveedorSesion } from "./auth.jsx";
import { aplicarTema, temaInicial } from "./tema.js";
import "./styles.css";

// Antes del primer render: si no, se ve un destello del tema equivocado.
aplicarTema(temaInicial());

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorSesion>
        <App />
      </ProveedorSesion>
    </BrowserRouter>
  </StrictMode>,
);
