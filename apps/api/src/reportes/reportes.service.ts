import type { Ejercicio, NuevoReporte } from "@anatomia/contenido";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { EstadoReporte } from "@prisma/client";
import { tituloEjercicio } from "../contenido/contenido.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Guarda el reporte de un estudiante (un id que ya existe se ignora: reenviarlo no lo duplica) y su evento. */
  async crear(usuarioId: string, r: NuevoReporte): Promise<void> {
    const { count } = await this.prisma.reporteError.createMany({
      data: [{ ...r, usuarioId, creado: new Date(r.creado) }],
      skipDuplicates: true,
    });
    if (count > 0) {
      await this.prisma.evento.create({ data: { usuarioId, nombre: "reporte_creado", propiedades: { ejercicioId: r.ejercicioId, motivo: r.motivo } } });
    }
  }

  /**
   * Reportes con su ejercicio (tipo, título y estado), los más nuevos primero. Quién reportó no sale: a la
   * revisora le basta el ejercicio. Un ejercicio que ya no existe llega como null.
   */
  async listar(filtro: { estado?: EstadoReporte; ejercicioId?: string }) {
    const reportes = await this.prisma.reporteError.findMany({ where: filtro, orderBy: { creado: "desc" } });
    const ejercicios = await this.prisma.ejercicio.findMany({ where: { id: { in: [...new Set(reportes.map((r) => r.ejercicioId))] } } });
    const porId = new Map(ejercicios.map((e) => [e.id, e]));
    return reportes.map(({ usuarioId: _u, ...r }) => {
      const e = porId.get(r.ejercicioId);
      return { ...r, ejercicio: e ? { tipo: e.tipo, titulo: tituloEjercicio(e.data as Ejercicio), estado: e.estado } : null };
    });
  }

  async conteos(): Promise<Record<EstadoReporte, number>> {
    const grupos = await this.prisma.reporteError.groupBy({ by: ["estado"], _count: true });
    const total: Record<EstadoReporte, number> = { abierto: 0, resuelto: 0 };
    for (const g of grupos) total[g.estado] = g._count;
    return total;
  }

  async cambiarEstado(id: string, estado: EstadoReporte): Promise<void> {
    const { count } = await this.prisma.reporteError.updateMany({ where: { id }, data: { estado } });
    if (count === 0) throw new NotFoundException("Ese reporte no existe");
  }
}
