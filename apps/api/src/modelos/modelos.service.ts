import type { Imagen } from "@anatomia/contenido";
import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { guardarArchivo } from "../almacen/almacen";
import { mismoJson } from "../comun/json";
import { ContenidoService } from "../contenido/contenido.service";
import { PrismaService } from "../prisma/prisma.service";
import { DatosModelo, modelo3dParaImagen } from "./modelo3d";

export type ResultadoModelo =
  | { imagenId: string; estado: "actualizada"; estructuras: number; ocultas: number }
  | { imagenId: string; estado: "sin_cambios" | "no_existe" };

@Injectable()
export class ModelosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contenido: ContenidoService,
  ) {}

  /**
   * Guarda el modelo en el almacén (claves con el hash del contenido) y lo pone en cada imagen. Editar
   * una imagen aprobada la regresa a revisión: el modelo llega a la app cuando la revisora la aprueba.
   */
  async importar(json: string, bin: Buffer, o: { id: string; imagenes: string[] }) {
    const datos = DatosModelo.parse(JSON.parse(json));
    const hash = createHash("sha256").update(json).update(bin).digest("hex").slice(0, 10);
    const claves = { archivo: `modelos/${o.id}-${hash}.bin`, datos: `modelos/${o.id}-${hash}.json` };
    await guardarArchivo(claves.archivo, bin);
    await guardarArchivo(claves.datos, json);

    const fichas = new Set((await this.prisma.ficha.findMany({ select: { id: true } })).map((f) => f.id));
    const imagenes: ResultadoModelo[] = [];
    for (const imagenId of o.imagenes) {
      const fila = await this.prisma.imagen.findUnique({ where: { id: imagenId } });
      if (!fila) {
        imagenes.push({ imagenId, estado: "no_existe" });
        continue;
      }
      const { revision: _r, version: _v, ...imagen } = fila.data as Imagen;
      const modelo3d = modelo3dParaImagen(datos, imagenId, fichas, claves);
      if (mismoJson(imagen.modelo3d, modelo3d)) {
        imagenes.push({ imagenId, estado: "sin_cambios" });
        continue;
      }
      await this.contenido.guardarImagen(imagenId, { ...imagen, modelo3d });
      imagenes.push({ imagenId, estado: "actualizada", estructuras: Object.keys(modelo3d.estructuras).length, ocultas: modelo3d.ocultas.length });
    }
    return { claves, imagenes };
  }
}
