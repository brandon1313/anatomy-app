import {
  Ejercicio as EsquemaEjercicio,
  FichaMusculo as EsquemaFicha,
  Imagen as EsquemaImagen,
  type Ejercicio,
  type EjercicioBase,
  type EstadoRevision,
  type FichaMusculo,
  type FichaMusculoBase,
  type Imagen,
} from "@anatomia/contenido";
import { BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { mismoJson } from "../comun/json";
import { type DatosFicha, ejerciciosDeImagen, erroresParaAprobar, fusionar } from "../imagenes/ejercicios-imagen";
import { PrismaService } from "../prisma/prisma.service";
import { revisionAprobada, revisionRechazada, trasEditar } from "./revision";

export type Coleccion = "fichas" | "ejercicios" | "imagenes";
export type ImagenEditable = Omit<Imagen, "revision" | "version">;

export interface ElementoCola {
  coleccion: Coleccion;
  id: string;
  tipo: string;
  estado: EstadoRevision;
  version: number;
  titulo: string;
  notas?: string;
  /** Solo en ejercicios. */
  fichaIds?: string[];
  actualizado: Date;
}

export interface ResumenEjercicios {
  creados: number;
  actualizados: number;
  sinCambios: number;
}

const json = (v: unknown) => v as Prisma.InputJsonValue;
const sinRevision = <T extends { revision: unknown; version: unknown }>({ revision: _r, version: _v, ...base }: T) => base;

export function tituloEjercicio(e: Ejercicio): string {
  switch (e.tipo) {
    case "caso_clinico":
      return e.pregunta;
    case "identificar_imagen":
      return `¿Qué estructura está resaltada? (${e.opciones.find((o) => o.id === e.correcta)?.texto ?? e.zonaResaltada})`;
    default:
      return e.enunciado;
  }
}

@Injectable()
export class ContenidoService {
  constructor(private readonly prisma: PrismaService) {}

  /** `tipo` es "ficha", "imagen" o un tipo de ejercicio. */
  async cola(filtro: { estado?: EstadoRevision; tipo?: string }): Promise<ElementoCola[]> {
    const { estado, tipo } = filtro;
    const [fichas, imagenes, ejercicios] = await Promise.all([
      !tipo || tipo === "ficha" ? this.prisma.ficha.findMany({ where: { estado } }) : [],
      !tipo || tipo === "imagen" ? this.prisma.imagen.findMany({ where: { estado } }) : [],
      tipo !== "ficha" && tipo !== "imagen" ? this.prisma.ejercicio.findMany({ where: { estado, tipo } }) : [],
    ]);
    const elementos: ElementoCola[] = [
      ...fichas.map((f) => {
        const data = f.data as FichaMusculo;
        return { coleccion: "fichas" as const, id: f.id, tipo: "ficha", estado: f.estado, version: f.version, titulo: data.nombre.principal, notas: data.revision.notas, actualizado: f.actualizado };
      }),
      ...imagenes.map((i) => {
        const data = i.data as Imagen;
        return { coleccion: "imagenes" as const, id: i.id, tipo: "imagen", estado: i.estado, version: i.version, titulo: data.titulo, notas: data.revision.notas, actualizado: i.actualizado };
      }),
      ...ejercicios.map((e) => {
        const data = e.data as Ejercicio;
        return { coleccion: "ejercicios" as const, id: e.id, tipo: e.tipo, estado: e.estado, version: e.version, titulo: tituloEjercicio(data), notas: data.revision.notas, fichaIds: e.fichaIds, actualizado: e.actualizado };
      }),
    ];
    return elementos.sort((a, b) => b.actualizado.getTime() - a.actualizado.getTime());
  }

  async conteos() {
    const grupos = await Promise.all([
      this.prisma.ficha.groupBy({ by: ["estado"], _count: true }),
      this.prisma.imagen.groupBy({ by: ["estado"], _count: true }),
      this.prisma.ejercicio.groupBy({ by: ["estado"], _count: true }),
    ]);
    const total: Record<EstadoRevision, number> = { borrador: 0, en_revision: 0, aprobada: 0, rechazada: 0 };
    for (const g of grupos.flat()) total[g.estado] += g._count;
    return total;
  }

  // ───────────── Fichas ─────────────

  async ficha(id: string) {
    const f = await this.prisma.ficha.findUnique({ where: { id } });
    if (!f) throw new NotFoundException(`No existe la ficha ${id}`);
    const ejercicios = await this.prisma.ejercicio.findMany({ where: { fichaIds: { has: id } }, orderBy: { id: "asc" } });
    return { ficha: f.data as FichaMusculo, ejercicios: ejercicios.map((e) => e.data as Ejercicio) };
  }

  async guardarFicha(id: string, base: FichaMusculoBase) {
    if (base.id !== id) throw new BadRequestException("El id de la ficha no se puede cambiar");
    const actual = await this.prisma.ficha.findUnique({ where: { id } });
    if (!actual) throw new NotFoundException(`No existe la ficha ${id}`);
    const t = trasEditar(actual.estado, actual.version, (actual.data as FichaMusculo).revision);
    const data = EsquemaFicha.parse({ ...base, revision: t.revision, version: t.version });
    await this.prisma.ficha.update({ where: { id }, data: { estado: t.estado, version: t.version, data: json(data) } });
    return data;
  }

  // ───────────── Ejercicios ─────────────

  async ejercicio(id: string) {
    const e = await this.prisma.ejercicio.findUnique({ where: { id } });
    if (!e) throw new NotFoundException(`No existe el ejercicio ${id}`);
    const fichas = await this.prisma.ficha.findMany({ where: { id: { in: e.fichaIds } } });
    return {
      ejercicio: e.data as Ejercicio,
      fichas: fichas.map((f) => ({ id: f.id, nombre: (f.data as FichaMusculo).nombre.principal, estado: f.estado })),
    };
  }

  async guardarEjercicio(id: string, base: EjercicioBase) {
    if (base.id !== id) throw new BadRequestException("El id del ejercicio no se puede cambiar");
    const actual = await this.prisma.ejercicio.findUnique({ where: { id } });
    if (!actual) throw new NotFoundException(`No existe el ejercicio ${id}`);
    if (base.tipo !== actual.tipo) throw new BadRequestException("El tipo del ejercicio no se puede cambiar");
    const t = trasEditar(actual.estado, actual.version, (actual.data as Ejercicio).revision);
    const data = EsquemaEjercicio.parse({ ...base, revision: t.revision, version: t.version });
    await this.prisma.ejercicio.update({
      where: { id },
      data: { estado: t.estado, version: t.version, data: json(data), fichaIds: data.fichaIds },
    });
    return data;
  }

  // ───────────── Imágenes ─────────────

  async imagen(id: string) {
    const i = await this.prisma.imagen.findUnique({ where: { id } });
    if (!i) throw new NotFoundException(`No existe la imagen ${id}`);
    const data = i.data as Imagen;
    const [fichas, ejercicios] = await Promise.all([
      this.prisma.ficha.findMany({ where: { id: { in: [...new Set(data.zonas.map((z) => z.fichaId))] } } }),
      this.prisma.ejercicio.findMany({ where: { data: { path: ["imagenId"], equals: id } }, orderBy: { id: "asc" } }),
    ]);
    return {
      imagen: data,
      fichas: fichas.map((f) => ({ id: f.id, nombre: (f.data as FichaMusculo).nombre.principal, estado: f.estado })),
      ejercicios: ejercicios.map((e) => e.data as Ejercicio),
    };
  }

  async guardarImagen(id: string, base: ImagenEditable) {
    if (base.id !== id) throw new BadRequestException("El id de la imagen no se puede cambiar");
    const actual = await this.prisma.imagen.findUnique({ where: { id } });
    if (!actual) throw new NotFoundException(`No existe la imagen ${id}`);
    const t = trasEditar(actual.estado, actual.version, (actual.data as Imagen).revision);
    const data = EsquemaImagen.parse({ ...base, revision: t.revision, version: t.version });
    await this.prisma.imagen.update({
      where: { id },
      data: { estado: t.estado, version: t.version, data: json(data), archivoUrl: data.archivo },
    });
    return data;
  }

  /**
   * Crea o actualiza los ejercicios de tocar e identificar de la imagen. Los nuevos entran como
   * borrador; en los que ya existen se conserva lo que redactó la revisora (ver `fusionar`).
   */
  async sincronizarEjerciciosDeImagen(imagen: Imagen): Promise<ResumenEjercicios> {
    const fichas = await this.prisma.ficha.findMany({ where: { id: { in: imagen.zonas.map((z) => z.fichaId) } } });
    const datos = new Map<string, DatosFicha>(
      fichas.map((f) => {
        const d = f.data as FichaMusculo;
        return [f.id, { nombre: d.nombre.principal, compartimento: d.compartimento, acciones: d.acciones }];
      }),
    );
    const resumen: ResumenEjercicios = { creados: 0, actualizados: 0, sinCambios: 0 };
    for (const generado of ejerciciosDeImagen(imagen, datos)) {
      const existente = await this.prisma.ejercicio.findUnique({ where: { id: generado.id } });
      if (!existente) {
        const data = EsquemaEjercicio.parse({ ...generado, revision: { estado: "borrador" }, version: 1 });
        await this.prisma.ejercicio.create({ data: { id: data.id, tipo: data.tipo, data: json(data), fichaIds: data.fichaIds } });
        resumen.creados++;
        continue;
      }
      const anterior = sinRevision(existente.data as Ejercicio) as EjercicioBase;
      const nuevo = fusionar(generado, anterior);
      if (mismoJson(nuevo, anterior)) {
        resumen.sinCambios++;
      } else {
        await this.guardarEjercicio(nuevo.id, nuevo);
        resumen.actualizados++;
      }
    }
    return resumen;
  }

  // ───────────── Transiciones comunes ─────────────

  async enviarARevision(coleccion: Coleccion, id: string) {
    return this.cambiarEstado(coleccion, id, ["borrador"], { estado: "en_revision" });
  }

  async aprobar(coleccion: Coleccion, id: string, revisor: string) {
    if (coleccion === "imagenes") return this.aprobarImagen(id, revisor);
    if (coleccion === "ejercicios") await this.exigirImagenAprobada(id);
    const revision = revisionAprobada(revisor);
    const data = await this.cambiarEstado(coleccion, id, ["borrador", "en_revision", "rechazada"], revision);
    if (coleccion === "fichas") {
      await this.prisma.ficha.update({ where: { id }, data: { revisadoPor: revisor, revisadoEn: new Date(revision.fecha!) } });
    }
    return data;
  }

  /**
   * Un ejercicio de imagen se aprueba después de su imagen: así sus zonas ya están revisadas y no
   * queda un ejercicio aprobado que bloquee la publicación por apuntar a una imagen sin aprobar.
   */
  private async exigirImagenAprobada(ejercicioId: string) {
    const e = await this.prisma.ejercicio.findUnique({ where: { id: ejercicioId } });
    const data = e?.data as Ejercicio | undefined;
    if (!data || !("imagenId" in data)) return;
    const imagen = await this.prisma.imagen.findUnique({ where: { id: data.imagenId }, select: { estado: true } });
    if (imagen?.estado !== "aprobada") {
      throw new ConflictException(`Aprueba primero la imagen ${data.imagenId}; sus zonas son parte de este ejercicio`);
    }
  }

  /** PRD: al aprobar una imagen se crean sus ejercicios de tocar e identificar como borradores. */
  private async aprobarImagen(id: string, revisor: string) {
    const actual = await this.prisma.imagen.findUnique({ where: { id } });
    if (!actual) throw new NotFoundException(`No existe la imagen ${id}`);
    const fichas = await this.prisma.ficha.findMany({ select: { id: true } });
    const errores = erroresParaAprobar(actual.data as Imagen, new Set(fichas.map((f) => f.id)));
    if (errores.length) {
      throw new UnprocessableEntityException({ mensaje: "La imagen no se puede aprobar", errores: errores.map((mensaje) => ({ ruta: "", mensaje })) });
    }
    const imagen = (await this.cambiarEstado("imagenes", id, ["borrador", "en_revision", "rechazada"], revisionAprobada(revisor))) as Imagen;
    return { imagen, ejercicios: await this.sincronizarEjerciciosDeImagen(imagen) };
  }

  async rechazar(coleccion: Coleccion, id: string, revisor: string, nota: string) {
    return this.cambiarEstado(coleccion, id, ["borrador", "en_revision", "aprobada"], revisionRechazada(revisor, nota));
  }

  private async cambiarEstado(
    coleccion: Coleccion,
    id: string,
    desde: EstadoRevision[],
    revision: FichaMusculo["revision"],
  ) {
    const delegado = { fichas: this.prisma.ficha, ejercicios: this.prisma.ejercicio, imagenes: this.prisma.imagen }[coleccion];
    const actual = await (delegado as typeof this.prisma.ficha).findUnique({ where: { id } });
    if (!actual) throw new NotFoundException(`No existe ${id}`);
    if (!desde.includes(actual.estado)) {
      throw new ConflictException(`No se puede pasar de "${actual.estado}" a "${revision.estado}"`);
    }
    // Se revalida antes de escribir: lo guardado pudo venir de una versión anterior del esquema.
    const esquema = { fichas: EsquemaFicha, ejercicios: EsquemaEjercicio, imagenes: EsquemaImagen }[coleccion];
    const data = esquema.parse({ ...(actual.data as object), revision });
    await (delegado as typeof this.prisma.ficha).update({ where: { id }, data: { estado: revision.estado, data: json(data) } });
    return data;
  }
}
