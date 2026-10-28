import { PeticionEventos } from "@anatomia/contenido";
import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import type { z } from "zod";
import { UsuarioActual, type UsuarioToken } from "../comun/auth";
import { ZodPipe } from "../comun/zod.pipe";
import { PrismaService } from "../prisma/prisma.service";

/** Eventos de uso en lote (PRD, "Medición de la beta"). Un id que ya existe se ignora: reenviar no duplica. */
@Controller("eventos")
export class EventosController {
  constructor(private readonly prisma: PrismaService) {}

  @HttpCode(204)
  @Post()
  async recibir(@UsuarioActual() usuario: UsuarioToken, @Body(new ZodPipe(PeticionEventos)) { eventos }: z.infer<typeof PeticionEventos>) {
    await this.prisma.evento.createMany({
      data: eventos.map((e) => ({ ...e, usuarioId: usuario.id, creado: new Date(e.creado) })),
      skipDuplicates: true,
    });
  }
}
