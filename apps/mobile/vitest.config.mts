import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@anatomia/contenido": fileURLToPath(new URL("../../packages/contenido/src/index.ts", import.meta.url)) } },
  // El día de repaso se cuenta en hora local: las pruebas usan la de Guatemala (UTC−6), donde la fecha UTC
  // cambia a las 6 p. m.
  test: { include: ["src/**/*.test.ts"], env: { TZ: "America/Guatemala" } },
});
