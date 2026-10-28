import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Se usa el código fuente del paquete compartido: el mismo esquema que valida la API.
    alias: { "@anatomia/contenido": fileURLToPath(new URL("../../packages/contenido/src/index.ts", import.meta.url)) },
    // La app fija su React (Expo) en la raíz del monorepo y el panel tiene otro en su carpeta; las librerías
    // que viven en la raíz (React Query) usarían el de la app. Con dedupe todo usa el React del panel.
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 5174,
    // API_URL apunta el panel a otra API, por ejemplo la de prueba: API_URL=http://localhost:3001 pnpm dev
    proxy: { "/api": { target: process.env.API_URL ?? "http://localhost:3000", rewrite: (p) => p.replace(/^\/api/, "") } },
  },
});
