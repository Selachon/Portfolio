import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles/theme.css";
import "./styles/demos.css";

if (typeof window !== "undefined") {
  try {
    if (window.top !== window.self) {
      window.top.location = window.self.location;
    }
  } catch {
    window.self.location = window.location;
  }
}

// Punto de entrada principal de la aplicación React
// Monta la aplicación en el elemento root del DOM
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
