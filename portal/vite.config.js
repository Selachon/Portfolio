import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// El portal se compila aparte del sitio público y lo sirve el propio servidor
// de la API, para que la cookie de sesión sea de primera parte.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    // En desarrollo, la API vive en otro puerto; el proxy hace que el navegador
    // siga viendo un solo origen, igual que en producción.
    proxy: {
      "/api": {
        target: process.env.API_URL ?? "http://localhost:8787",
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
