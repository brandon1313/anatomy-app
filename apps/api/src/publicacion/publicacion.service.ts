import { Curso, type Ejercicio, type FichaMusculo, type Imagen, type PaqueteContenido } from "@anatomia/contenido";
import { ConflictException, Injectable, UnprocessableEntityException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { armarPaquete, mismoContenido } from "./paquete";

const json = (v: unknown) => v as Prisma.InputJsonValue;

@Injectable()
export class PublicacionService {
  constructor(private readonly prisma: PrismaService) {}

  /** La beta tiene un solo curso. */
  async curso(): Promise<Curso | null> {
    const c = await this.prisma.curso.findFirst({ orderBy: { id: "asc" } });
    return c ? (c.data as Curso) : null;
  }

  async guardarCurso(curso: Curso): Promise<Curso> {
    const data = Curso.parse(curso);
    const actual = await this.prisma.curso.findFirst();
    if (actual && actual.id !== data.id) throw new ConflictException(`Ya existe el curso ${actual.id}; la beta solo tiene uno`);
    await this.prisma.curso.upsert({ where: { id: data.id }, create: { id: data.id, data: json(data) }, update: { data: json(data) } });
    return data;
  }

  /** Arma el paquete que se publicaría con la versión siguiente, sin guardarlo. */
  async probar() {
    const [ultima, curso, fichas, imagenes, ejercicios] = await Promise.all([
      this.prisma.paquete.findFirst({ orderBy: { version: "desc" } }),
      this.curso(),
      this.prisma.ficha.findMany({ select: { id: true, estado: true, data: true } }),
      this.prisma.imagen.findMany({ where: { estado: "aprobada" } }),
      this.prisma.ejercicio.findMany({ select: { id: true, estado: true, data: true } }),
    ]);
    const aprobados = <T>(xs: { estado: string; data: unknown }[]) => xs.filter((x) => x.estado === "aprobada").map((x) => x.data as T);
    const resultado = armarPaquete(
      (ultima?.version ?? 0) + 1,
      {
        curso,
        fichas: aprobados<FichaMusculo>(fichas),
        imagenes: imagenes.map((i) => i.data as Imagen),
        ejercicios: aprobados<Ejercicio>(ejercicios),
      },
      {
        fichas: new Map(fichas.map((f) => [f.id, f.estado])),
        ejercicios: new Map(ejercicios.map((e) => [e.id, e.estado])),
      },
    );
    const sinCambios = resultado.ok && !!ultima && mismoContenido(resultado.paquete, ultima.contenido as PaqueteContenido);
    return { resultado, ultima: ultima?.version ?? 0, sinCambios };
  }

  async publicar(publicadoPor: string) {
    const { resultado, sinCambios, ultima } = await this.probar();
    if (!resultado.ok) throw new UnprocessableEntityException({ mensaje: "El paquete tiene errores", errores: resultado.errores.map((mensaje) => ({ ruta: "", mensaje })) });
    if (sinCambios) throw new ConflictException(`No hay cambios desde la versión ${ultima}`);
    const { paquete } = resultado;
    try {
      await this.prisma.paquete.create({ data: { version: paquete.version, contenido: json(paquete), publicadoPor } });
    } catch (e) {
      // Dos publicaciones a la vez: la versión es la llave, gana la primera.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("Otra persona acaba de publicar; vuelve a intentarlo");
      }
      throw e;
    }
    return { version: paquete.version, conteos: conteos(paquete) };
  }

  async historial() {
    const paquetes = await this.prisma.paquete.findMany({ orderBy: { version: "desc" }, take: 50 });
    return paquetes.map((p) => ({
      version: p.version,
      publicadoPor: p.publicadoPor,
      publicadoEn: p.publicadoEn,
      conteos: conteos(p.contenido as PaqueteContenido),
    }));
  }

  /** Para la app: trae el contenido solo si hay una versión más nueva que la local. */
  async actual(desde: number) {
    const ultima = await this.prisma.paquete.findFirst({ orderBy: { version: "desc" }, select: { version: true } });
    if (!ultima) return { version: 0 };
    if (ultima.version <= desde) return { version: ultima.version };
    const p = await this.prisma.paquete.findUniqueOrThrow({ where: { version: ultima.version } });
    return { version: p.version, contenido: p.contenido as PaqueteContenido };
  }
}

export function conteos(p: PaqueteContenido) {
  return {
    lecciones: p.curso.unidades.reduce((n, u) => n + u.lecciones.length, 0),
    fichas: p.fichas.length,
    imagenes: p.imagenes.length,
    ejercicios: p.ejercicios.length,
  };
}
