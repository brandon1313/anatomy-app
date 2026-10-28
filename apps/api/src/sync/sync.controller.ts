import { PeticionSync } from "@anatomia/contenido";
import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { UsuarioActual, type UsuarioToken } from "../comun/auth";
import { ZodPipe } from "../comun/zod.pipe";
import { SyncService } from "./sync.service";

/** El dispositivo sube intentos y progreso y recibe el progreso consolidado (PRD, "Sin internet y sincronización"). */
@Controller("sync")
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @HttpCode(200)
  @Post()
  sincronizar(@UsuarioActual() usuario: UsuarioToken, @Body(new ZodPipe(PeticionSync)) cuerpo: PeticionSync) {
    return this.sync.sincronizar(usuario.id, cuerpo);
  }
}
