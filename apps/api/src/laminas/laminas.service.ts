import { FichaMusculo, Imagen } from "@anatomia/contenido";
import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { guardarArchivo } from "../almacen/almacen";
import { ContenidoService, type ResumenEjercicios } from "../contenido/contenido.service";
import { PrismaService } from "../prisma/prisma.service";
import { CAPAS, fichasDeLamina, leerLamina, svgDeCapa, zonasDeCapa } from "./lamina";
import { renderizarWebp } from "./render";

const json = (v: unknown) => v as Prisma.InputJsonValue;

export interface OpcionesImportacion {
  /** Base de los ids de las imágenes: "muslo-anterior" → "muslo-anterior-superficial" y "-profunda". */
  id: string;
  titulo: string;
  region: string;
}

export interface ResultadoImportacion {
  fichas: { creadas: string[]; omitidas: string[] };
  imagenes: ({ id: string; estado: "creada"; archivo: string; zonas: number; ejercicios: ResumenEjercicios } | { id: string; estado: "omitida" })[];
}

/**
 * Importa una lámina vectorial: fichas de sus músculos, una imagen por capa (WebP en el almacén, con
 * sus zonas) y los ejercicios de imagen. Todo entra como borrador y nunca pisa algo que ya existe.
 */
@Injectable()
export class LaminasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contenido: ContenidoService,
  ) {}

  async importar(html: string, o: OpcionesImportacion): Promise<ResultadoImportacion> {
    const lamina = leerLamina(html);
    const resultado: ResultadoImportacion = { fichas: { creadas: [], omitidas: [] }, imagenes: [] };

    for (const base of fichasDeLamina(lamina, o.region)) {
      if (await this.prisma.ficha.findUnique({ where: { id: base.id } })) {
        resultado.fichas.omitidas.push(base.id);
        continue;
      }
      const data = FichaMusculo.parse({ ...base, revision: { estado: "borrador" }, version: 1 });
      await this.prisma.ficha.create({ data: { id: data.id, data: json(data) } });
      resultado.fichas.creadas.push(data.id);
    }

    for (const capa of CAPAS) {
      const id = `${o.id}-${capa}`;
      if (await this.prisma.imagen.findUnique({ where: { id } })) {
        resultado.imagenes.push({ id, estado: "omitida" });
        continue;
      }
      const { webp, ancho, alto } = await renderizarWebp(svgDeCapa(lamina, capa));
      const archivo = `imagenes/${id}-${createHash("sha256").update(webp).digest("hex").slice(0, 12)}.webp`;
      await guardarArchivo(archivo, webp);
      const data = Imagen.parse({
        id,
        titulo: `${o.titulo} (capa ${capa})`,
        archivo,
        ancho,
        alto,
        licencia: { tipo: "propia" },
        sinEtiquetas: true,
        zonas: zonasDeCapa(lamina, capa),
        revision: { estado: "borrador" },
        version: 1,
      });
      await this.prisma.imagen.create({ data: { id, data: json(data), archivoUrl: archivo } });
      const ejercicios = await this.contenido.sincronizarEjerciciosDeImagen(data);
      resultado.imagenes.push({ id, estado: "creada", archivo, zonas: data.zonas.length, ejercicios });
    }
    return resultado;
  }
}
