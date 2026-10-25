import { Curso } from "@anatomia/contenido";
import { Body, Controller, Get, HttpCode, Post, Put, Query } from "@nestjs/common";
import { z } from "zod";
import { Roles, UsuarioActual, type UsuarioToken } from "../comun/auth";
import { ZodPipe } from "../comun/zod.pipe";
import { conteos, PublicacionService } from "./publicacion.service";

@Controller()
export class PublicacionController {
  constructor(private readonly publicacion: PublicacionService) {}

  @Roles("editor")
  @Get("admin/curso")
  async curso() {
    return { curso: await this.publicacion.curso() };
  }

  @Roles("editor")
  @Put("admin/curso")
  guardarCurso(@Body(new ZodPipe(Curso)) curso: z.infer<typeof Curso>) {
    return this.publicacion.guardarCurso(curso);
  }

  /** Lo que se publicaría ahora: errores o conteos, y el historial. */
  @Roles("admin")
  @Get("admin/paquetes")
  async paquetes() {
    const [{ resultado, ultima, sinCambios }, historial] = await Promise.all([this.publicacion.probar(), this.publicacion.historial()]);
    return {
      siguiente: resultado.ok
        ? { version: resultado.paquete.version, conteos: conteos(resultado.paquete), errores: [], sinCambios }
        : { version: ultima + 1, errores: resultado.errores, sinCambios: false },
      historial,
    };
  }

  @Roles("admin")
  @HttpCode(200)
  @Post("admin/publicar")
  publicar(@UsuarioActual() usuario: UsuarioToken) {
    return this.publicacion.publicar(usuario.nombre);
  }

  @Get("paquete/actual")
  actual(@Query("desde", new ZodPipe(z.coerce.number().int().nonnegative().default(0))) desde: number) {
    return this.publicacion.actual(desde);
  }
}
