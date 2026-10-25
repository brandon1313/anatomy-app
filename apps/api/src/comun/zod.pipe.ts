import { BadRequestException, PipeTransform } from "@nestjs/common";
import { z } from "zod";

/** Valida el cuerpo con un esquema de zod; responde 400 con la lista de errores. */
export class ZodPipe<T extends z.ZodType> implements PipeTransform<unknown, z.infer<T>> {
  constructor(private readonly esquema: T) {}

  transform(valor: unknown): z.infer<T> {
    const r = this.esquema.safeParse(valor);
    if (!r.success) {
      throw new BadRequestException({
        mensaje: "Datos inválidos",
        errores: r.error.issues.map((i) => ({ ruta: i.path.join("."), mensaje: i.message })),
      });
    }
    return r.data;
  }
}
