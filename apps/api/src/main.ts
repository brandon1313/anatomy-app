import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { PREFIJO_ARCHIVOS } from "./almacen/almacen";
import { AppModule } from "./app.module";
import { config } from "./config";

async function main() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const origenes = config.CORS_ORIGENES.split(",").map((o) => o.trim()).filter(Boolean);
  if (origenes.length) app.enableCors({ origin: origenes });
  app.getHttpAdapter().getInstance().disable("x-powered-by");
  // Archivos públicos con nombre por hash: inmutables. Un SVG no puede ejecutar scripts.
  app.useStaticAssets(config.ALMACEN_DIR, {
    prefix: PREFIJO_ARCHIVOS,
    immutable: true,
    maxAge: "365d",
    setHeaders: (res, ruta) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      if (ruta.endsWith(".svg")) res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'");
    },
  });
  await app.listen(config.PORT);
}

main();
