import { EjercicioBase, EstadoRevision, FichaMusculoBase, Imagen } from "@anatomia/contenido";
import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from "@nestjs/common";
import { z } from "zod";
import { Roles, UsuarioActual, type UsuarioToken } from "../comun/auth";
import { ZodPipe } from "../comun/zod.pipe";
import { type Coleccion, ContenidoService } from "./contenido.service";

const FiltroCola = z.object({ estado: EstadoRevision.optional(), tipo: z.string().optional() });
const ColeccionParam = z.enum(["fichas", "ejercicios", "imagenes"]);
/** Lo editable de una imagen: todo menos la revisión y la versión, que maneja el servidor. */
const ImagenEditable = Imagen.omit({ revision: true, version: true });
const Rechazo = z.object({ nota: z.string().trim().min(1, "El rechazo necesita una nota") });

@Roles("editor")
@Controller("admin")
export class ContenidoController {
  constructor(private readonly contenido: ContenidoService) {}

  @Get("cola")
  async cola(@Query(new ZodPipe(FiltroCola)) filtro: z.infer<typeof FiltroCola>) {
    const [elementos, conteos] = await Promise.all([this.contenido.cola(filtro), this.contenido.conteos()]);
    return { elementos, conteos };
  }

  @Get("fichas/:id")
  ficha(@Param("id") id: string) {
    return this.contenido.ficha(id);
  }

  @Put("fichas/:id")
  guardarFicha(@Param("id") id: string, @Body(new ZodPipe(FichaMusculoBase)) ficha: z.infer<typeof FichaMusculoBase>) {
    return this.contenido.guardarFicha(id, ficha);
  }

  @Get("ejercicios/:id")
  ejercicio(@Param("id") id: string) {
    return this.contenido.ejercicio(id);
  }

  @Put("ejercicios/:id")
  guardarEjercicio(@Param("id") id: string, @Body(new ZodPipe(EjercicioBase)) ejercicio: z.infer<typeof EjercicioBase>) {
    return this.contenido.guardarEjercicio(id, ejercicio);
  }

  @Get("imagenes/:id")
  imagen(@Param("id") id: string) {
    return this.contenido.imagen(id);
  }

  @Put("imagenes/:id")
  guardarImagen(@Param("id") id: string, @Body(new ZodPipe(ImagenEditable)) imagen: z.infer<typeof ImagenEditable>) {
    return this.contenido.guardarImagen(id, imagen);
  }

  @HttpCode(200)
  @Post(":coleccion/:id/enviar")
  enviar(@Param("coleccion", new ZodPipe(ColeccionParam)) coleccion: Coleccion, @Param("id") id: string) {
    return this.contenido.enviarARevision(coleccion, id);
  }

  @HttpCode(200)
  @Post(":coleccion/:id/aprobar")
  aprobar(
    @Param("coleccion", new ZodPipe(ColeccionParam)) coleccion: Coleccion,
    @Param("id") id: string,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.contenido.aprobar(coleccion, id, usuario.nombre);
  }

  @HttpCode(200)
  @Post(":coleccion/:id/rechazar")
  rechazar(
    @Param("coleccion", new ZodPipe(ColeccionParam)) coleccion: Coleccion,
    @Param("id") id: string,
    @Body(new ZodPipe(Rechazo)) { nota }: z.infer<typeof Rechazo>,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.contenido.rechazar(coleccion, id, usuario.nombre, nota);
  }
}
