/**
 * pnpm --filter @anatomia/api generar --unidad musculos-muslo --musculos "Recto femoral, Vasto lateral"
 */
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { parseArgs } from "node:util";
import { PrismaModule } from "../prisma/prisma.module";
import { Module } from "@nestjs/common";
import { GeneradorService } from "./generador.service";

@Module({ imports: [PrismaModule], providers: [GeneradorService] })
class GeneradorCliModule {}

async function main() {
  const { values } = parseArgs({ options: { unidad: { type: "string" }, musculos: { type: "string" } } });
  if (!values.unidad || !values.musculos) {
    console.error('Uso: generar --unidad musculos-muslo --musculos "Recto femoral, Vasto lateral"');
    process.exit(1);
  }
  const app = await NestFactory.createApplicationContext(GeneradorCliModule, { logger: ["log", "warn", "error"] });
  try {
    const resultados = await app.get(GeneradorService).generar(values.unidad, values.musculos.split(","));
    for (const r of resultados) {
      if (r.estado === "creado") console.log(`✓ ${r.musculo}: ${r.ejercicioIds.length} ejercicios (intentos: ${r.intentos})`);
      else if (r.estado === "omitido") console.log(`- ${r.musculo}: ${r.motivo}`);
      else console.log(`✗ ${r.musculo}:\n    ${r.errores.join("\n    ")}`);
    }
    if (resultados.some((r) => r.estado === "fallido")) process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main();
