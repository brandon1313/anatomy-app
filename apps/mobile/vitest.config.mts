import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@anatomia/contenido": fileURLToPath(new URL("../../packages/contenido/src/index.ts", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"] },
});
