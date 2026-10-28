/**
 * pnpm --filter @anatomia/api importar-ejercicios ../../contenido/ejercicios-texto/*.json
 *
 * Carga ejercicios de texto escritos a mano para fichas que ya existen. Entran como borrador,
 * versión 1; un id que ya existe no se toca (puede tener trabajo de la revisora).
 */
import "reflect-metadata";
import { Ejercicio } from "@anatomia/contenido";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { Prisma } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { PrismaModule } from "../prisma/prisma.module";
import { PrismaService } from "../prisma/prisma.service";
import { validarEjerciciosTexto } from "./validar";

@Module({ imports: [PrismaModule] })
class ImportarEjerciciosCliModule {}

async function main() {
  const archivos = process.argv.slice(2);
  if (!archivos.length) {
    console.error("Uso: importar-ejercicios <ejercicios.json>...");
    process.exit(1);
  }
  const datos = (await Promise.all(archivos.map(async (a) => JSON.parse(await readFile(a, "utf8")) as unknown[]))).flat();

  const app = await NestFactory.createApplicationContext(ImportarEjerciciosCliModule, { logger: ["warn", "error"] });
  try {
    const prisma = app.get(PrismaService);
    const fichas = (await prisma.ficha.findMany({ select: { id: true } })).map((f) => f.id);
    const r = validarEjerciciosTexto(datos, fichas);
    if (!r.ok) {
      console.error(`No se importó nada:\n  ${r.errores.join("\n  ")}`);
      process.exitCode = 1;
      return;
    }
    const existentes = new Set((await prisma.ejercicio.findMany({ where: { id: { in: r.ejercicios.map((e) => e.id) } }, select: { id: true } })).map((e) => e.id));
    const nuevos = r.ejercicios.filter((e) => !existentes.has(e.id)).map((e) => Ejercicio.parse({ ...e, revision: { estado: "borrador" }, version: 1 }));
    await prisma.$transaction(
      nuevos.map((e) => prisma.ejercicio.create({ data: { id: e.id, tipo: e.tipo, data: e as Prisma.InputJsonValue, fichaIds: e.fichaIds } })),
    );
    console.log(`Ejercicios creados como borrador: ${nuevos.length}`);
    if (existentes.size) console.log(`Ya existían, no se tocaron (${existentes.size}): ${[...existentes].join(", ")}`);
  } finally {
    await app.close();
  }
}

main();
