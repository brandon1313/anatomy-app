import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from "@nestjs/common";
import { z } from "zod";
import { Roles } from "../comun/auth";
import { ZodPipe } from "../comun/zod.pipe";
import { PrismaService } from "../prisma/prisma.service";

const CambioRol = z.object({ rol: z.enum(["estudiante", "editor", "admin"]) });
const campos = { id: true, email: true, nombre: true, universidad: true, rol: true, creado: true } as const;

@Roles("admin")
@Controller("admin/usuarios")
export class UsuariosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  listar() {
    return this.prisma.usuario.findMany({ select: campos, orderBy: { creado: "desc" } });
  }

  @Put(":id/rol")
  cambiarRol(@Param("id", ParseUUIDPipe) id: string, @Body(new ZodPipe(CambioRol)) { rol }: z.infer<typeof CambioRol>) {
    return this.prisma.usuario.update({ where: { id }, data: { rol }, select: campos });
  }
}
