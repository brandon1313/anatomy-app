import {
  Ejercicio as EsquemaEjercicio,
  FichaMusculo as EsquemaFicha,
  type Ejercicio,
  type EjercicioBase,
  type EstadoRevision,
  type FichaMusculo,
  type FichaMusculoBase,
} from "@anatomia/contenido";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { revisionAprobada, revisionRechazada, trasEditar } from "./revision";

export type Coleccion = "fichas" | "ejercicios";

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

const json = (v: unknown) => v as Prisma.InputJsonValue;

function tituloEjercicio(e: Ejercicio): string {
  switch (e.tipo) {
    case "caso_clinico":
      return e.pregunta;
    case "identificar_imagen":
      return `¿Qué estructura está resaltada? (${e.zonaResaltada})`;
    default:
      return e.enunciado;
  }
}

@Injectable()
export class ContenidoService {
  constructor(private readonly prisma: PrismaService) {}

  /** `tipo` es "ficha" o un tipo de ejercicio. */
  async cola(filtro: { estado?: EstadoRevision; tipo?: string }): Promise<ElementoCola[]> {
    const { estado, tipo } = filtro;
    const [fichas, ejercicios] = await Promise.all([
      !tipo || tipo === "ficha"
        ? this.prisma.ficha.findMany({ where: { estado }, orderBy: { actualizado: "desc" } })
        : [],
      tipo !== "ficha"
        ? this.prisma.ejercicio.findMany({ where: { estado, tipo }, orderBy: { actualizado: "desc" } })
        : [],
    ]);
    const elementos: ElementoCola[] = [
      ...fichas.map((f) => {
        const data = f.data as FichaMusculo;
        return { coleccion: "fichas" as const, id: f.id, tipo: "ficha", estado: f.estado, version: f.version, titulo: data.nombre.principal, notas: data.revision.notas, actualizado: f.actualizado };
      }),
      ...ejercicios.map((e) => {
        const data = e.data as Ejercicio;
        return { coleccion: "ejercicios" as const, id: e.id, tipo: e.tipo, estado: e.estado, version: e.version, titulo: tituloEjercicio(data), notas: data.revision.notas, fichaIds: e.fichaIds, actualizado: e.actualizado };
      }),
    ];
    return elementos.sort((a, b) => b.actualizado.getTime() - a.actualizado.getTime());
  }

  async conteos() {
    const [f, e] = await Promise.all([
      this.prisma.ficha.groupBy({ by: ["estado"], _count: true }),
      this.prisma.ejercicio.groupBy({ by: ["estado"], _count: true }),
    ]);
    const total: Record<EstadoRevision, number> = { borrador: 0, en_revision: 0, aprobada: 0, rechazada: 0 };
    for (const g of [...f, ...e]) total[g.estado] += g._count;
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

  // ───────────── Transiciones comunes ─────────────

  async enviarARevision(coleccion: Coleccion, id: string) {
    return this.cambiarEstado(coleccion, id, ["borrador"], { estado: "en_revision" });
  }

  async aprobar(coleccion: Coleccion, id: string, revisor: string) {
    const revision = revisionAprobada(revisor);
    const data = await this.cambiarEstado(coleccion, id, ["borrador", "en_revision", "rechazada"], revision);
    if (coleccion === "fichas") {
      await this.prisma.ficha.update({ where: { id }, data: { revisadoPor: revisor, revisadoEn: new Date(revision.fecha!) } });
    }
    return data;
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
    const delegado = coleccion === "fichas" ? this.prisma.ficha : this.prisma.ejercicio;
    const actual = await (delegado as typeof this.prisma.ficha).findUnique({ where: { id } });
    if (!actual) throw new NotFoundException(`No existe ${id}`);
    if (!desde.includes(actual.estado)) {
      throw new ConflictException(`No se puede pasar de "${actual.estado}" a "${revision.estado}"`);
    }
    // Se revalida antes de escribir: lo guardado pudo venir de una versión anterior del esquema.
    const esquema = coleccion === "fichas" ? EsquemaFicha : EsquemaEjercicio;
    const data = esquema.parse({ ...(actual.data as object), revision });
    await (delegado as typeof this.prisma.ficha).update({ where: { id }, data: { estado: revision.estado, data: json(data) } });
    return data;
  }
}
