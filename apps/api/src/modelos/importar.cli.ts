/**
 * pnpm --filter @anatomia/api importar-modelo --datos ../../prototipos/modelo.json --bin ../../prototipos/modelo.bin \
 *   --id muslo-derecho --imagenes muslo-anterior-superficial,muslo-anterior-profunda
 */
import "reflect-metadata";
import { Id } from "@anatomia/contenido";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { z } from "zod";
import { PrismaModule } from "../prisma/prisma.module";
import { ModelosModule } from "./modelos.module";
import { ModelosService } from "./modelos.service";

@Module({ imports: [PrismaModule, ModelosModule] })
class ImportarModeloCliModule {}

const Args = z.object({
  datos: z.string().min(1),
  bin: z.string().min(1),
  id: Id,
  imagenes: z.string().min(1).transform((s) => s.split(",").map((i) => i.trim())),
});

async function main() {
  const { values } = parseArgs({
    options: { datos: { type: "string" }, bin: { type: "string" }, id: { type: "string" }, imagenes: { type: "string" } },
  });
  const args = Args.safeParse(values);
  if (!args.success) {
    console.error("Uso: importar-modelo --datos <modelo.json> --bin <modelo.bin> --id muslo-derecho --imagenes <id1,id2>");
    process.exit(1);
  }
  const app = await NestFactory.createApplicationContext(ImportarModeloCliModule, { logger: ["warn", "error"] });
  try {
    const { datos, bin, ...opciones } = args.data;
    const r = await app.get(ModelosService).importar(await readFile(datos, "utf8"), await readFile(bin), opciones);
    console.log(`Modelo guardado: ${r.claves.archivo} y ${r.claves.datos}`);
    for (const i of r.imagenes) {
      if (i.estado === "actualizada") console.log(`✓ ${i.imagenId}: ${i.estructuras} estructuras con ficha, ${i.ocultas} ocultas. Vuelve a revisión.`);
      else console.log(`- ${i.imagenId}: ${i.estado === "no_existe" ? "no existe" : "sin cambios"}`);
    }
  } finally {
    await app.close();
  }
}

main();
