import { Body, Controller, Delete, HttpCode, Post, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { Publico, UsuarioActual, type UsuarioToken } from "../comun/auth";
import { ZodPipe } from "../comun/zod.pipe";
import { PrismaService } from "../prisma/prisma.service";
import { Login, Registro, TokenRenovacion } from "./auth.dto";
import { AuthService } from "./auth.service";

@Controller("auth")
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Publico()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("registro")
  registro(@Body(new ZodPipe(Registro)) datos: Registro) {
    return this.auth.registrar(datos);
  }

  @Publico()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post("login")
  login(@Body(new ZodPipe(Login)) datos: Login) {
    return this.auth.login(datos);
  }

  @Publico()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(200)
  @Post("renovar")
  renovar(@Body(new ZodPipe(TokenRenovacion)) { tokenRenovacion }: { tokenRenovacion: string }) {
    return this.auth.renovar(tokenRenovacion);
  }

  @Publico()
  @HttpCode(204)
  @Post("salir")
  salir(@Body(new ZodPipe(TokenRenovacion)) { tokenRenovacion }: { tokenRenovacion: string }) {
    return this.auth.salir(tokenRenovacion);
  }
}

@Controller("me")
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  /** Borra la cuenta; las tablas del usuario se borran en cascada. */
  @HttpCode(204)
  @Delete()
  async borrar(@UsuarioActual() usuario: UsuarioToken) {
    await this.prisma.usuario.delete({ where: { id: usuario.id } });
  }
}
