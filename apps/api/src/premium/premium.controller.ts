import { PeticionInteresPremium } from "@anatomia/contenido";
import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import type { z } from "zod";
import { UsuarioActual, type UsuarioToken } from "../comun/auth";
import { ZodPipe } from "../comun/zod.pipe";
import { PremiumService } from "./premium.service";

/** Pantalla de interés en Premium (PRD): la oferta que se muestra y el toque en "Me interesa". */
@Controller()
export class PremiumController {
  constructor(private readonly premium: PremiumService) {}

  @Get("premium")
  oferta() {
    return this.premium.oferta();
  }

  @HttpCode(204)
  @Post("interes-premium")
  interes(@UsuarioActual() usuario: UsuarioToken, @Body(new ZodPipe(PeticionInteresPremium)) { plan }: z.infer<typeof PeticionInteresPremium>) {
    return this.premium.registrarInteres(usuario.id, plan);
  }
}
