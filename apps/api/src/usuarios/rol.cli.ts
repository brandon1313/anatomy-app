/**
 * Cambia el rol de un usuario existente; sirve para crear el primer admin.
 *   pnpm --filter @anatomia/api rol --email revisora@ejemplo.com --rol editor
 */
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import { parseArgs } from "node:util";
import { z } from "zod";

const { values } = parseArgs({ options: { email: { type: "string" }, rol: { type: "string" } } });
const args = z.object({ email: z.email(), rol: z.enum(["estudiante", "editor", "admin"]) }).parse(values);

const prisma = new PrismaClient();
prisma.usuario
  .update({ where: { email: args.email.toLowerCase() }, data: { rol: args.rol } })
  .then((u) => console.log(`${u.email} ahora es ${u.rol}`))
  .catch((e) => {
    console.error(e.code === "P2025" ? `No existe el usuario ${args.email}` : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
