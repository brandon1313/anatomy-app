import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { z } from "zod";
import { Roles } from "../comun/auth";
import { ZodPipe } from "../comun/zod.pipe";
import { GeneradorService } from "./generador.service";

const Pedido = z.object({
  unidad: z.string().min(1),
  musculos: z.array(z.string().trim().min(1)).min(1).max(15),
});

@Roles("editor")
@Controller("admin/generar")
export class GeneradorController {
  constructor(private readonly generador: GeneradorService) {}

  @HttpCode(200)
  @Post()
  async generar(@Body(new ZodPipe(Pedido)) { unidad, musculos }: z.infer<typeof Pedido>) {
    return { resultados: await this.generador.generar(unidad, musculos) };
  }
}
