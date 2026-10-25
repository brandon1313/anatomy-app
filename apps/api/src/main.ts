import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { config } from "./config";

async function main() {
  const app = await NestFactory.create(AppModule);
  const origenes = config.CORS_ORIGENES.split(",").map((o) => o.trim()).filter(Boolean);
  if (origenes.length) app.enableCors({ origin: origenes });
  app.getHttpAdapter().getInstance().disable("x-powered-by");
  await app.listen(config.PORT);
}

main();
