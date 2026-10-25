import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Se usa el código fuente del paquete compartido: el mismo esquema que valida la API.
    alias: { "@anatomia/contenido": fileURLToPath(new URL("../../packages/contenido/src/index.ts", import.meta.url)) },
  },
  server: {
    port: 5174,
    proxy: { "/api": { target: "http://localhost:3000", rewrite: (p) => p.replace(/^\/api/, "") } },
  },
});
