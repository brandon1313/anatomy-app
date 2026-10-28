/**
 * pnpm --filter @anatomia/api importar-lamina --archivo ../../contenido/laminas/muslo-derecho-anterior.html \
 *   --id muslo-anterior --titulo "Muslo derecho, vista anterior"
 */
import "reflect-metadata";
import { Id } from "@anatomia/contenido";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { z } from "zod";
import { PrismaModule } from "../prisma/prisma.module";
import { LaminasModule } from "./laminas.module";
import { LICENCIA_BODYPARTS3D } from "../modelos/modelo3d";
import { LaminasService } from "./laminas.service";

@Module({ imports: [PrismaModule, LaminasModule] })
class ImportarCliModule {}

const Args = z.object({
  archivo: z.string().min(1),
  id: Id,
  titulo: z.string().min(1),
  region: z.string().min(1).default("muslo"),
  /** "propia" para las dibujadas a mano; "bodyparts3d" para las generadas desde un modelo 3D. */
  licencia: z.enum(["propia", "bodyparts3d"]).default("propia"),
});

async function main() {
  const { values } = parseArgs({
    options: { archivo: { type: "string" }, id: { type: "string" }, titulo: { type: "string" }, region: { type: "string" }, licencia: { type: "string" } },
  });
  const args = Args.safeParse(values);
  if (!args.success) {
    console.error('Uso: importar-lamina --archivo <lamina.html> --id muslo-anterior --titulo "Muslo derecho, vista anterior" [--region muslo] [--licencia propia|bodyparts3d]');
    process.exit(1);
  }
  const app = await NestFactory.createApplicationContext(ImportarCliModule, { logger: ["warn", "error"] });
  try {
    const { archivo, licencia, ...opciones } = args.data;
    const r = await app.get(LaminasService).importar(await readFile(archivo, "utf8"), {
      ...opciones,
      licencia: licencia === "bodyparts3d" ? LICENCIA_BODYPARTS3D : { tipo: "propia" },
    });
    console.log(`Fichas creadas (${r.fichas.creadas.length}): ${r.fichas.creadas.join(", ") || "ninguna"}`);
    if (r.fichas.omitidas.length) console.log(`Fichas que ya existían (${r.fichas.omitidas.length}): ${r.fichas.omitidas.join(", ")}`);
    for (const i of r.imagenes) {
      if (i.estado === "omitida") console.log(`- ${i.id}: ya existía, no se tocó`);
      else console.log(`✓ ${i.id}: ${i.zonas} zonas, ${i.ejercicios.creados} ejercicios nuevos → ${i.archivo}`);
    }
  } finally {
    await app.close();
  }
}

main();
