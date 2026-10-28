import { fusionarProgreso, type PeticionSync, type ProgresoSync, type RespuestaSync } from "@anatomia/contenido";
import { Injectable } from "@nestjs/common";
import type { ProgresoFicha as FilaProgreso } from "@prisma/client";
import { mismoJson } from "../comun/json";
import { PrismaService } from "../prisma/prisma.service";

/** Una fila de progreso_ficha como viaja en /sync. */
export function aProgresoSync(f: FilaProgreso): ProgresoSync {
  return {
    fichaId: f.fichaId,
    estado: f.estado as ProgresoSync["estado"],
    estabilidad: f.estabilidad,
    dificultad: f.dificultad,
    diasProgramados: f.diasProgramados,
    pasosAprendizaje: f.pasosAprendizaje,
    repeticiones: f.repeticiones,
    lapsos: f.lapsos,
    ultimaRevision: f.ultimaRevision?.toISOString(),
    proximaRevision: f.proximaRevision.toISOString(),
    ultimoEjercicioId: f.ultimoEjercicioId ?? undefined,
  };
}

/** Lo contrario: el progreso de /sync como columnas (fechas como Date, opcionales como null). */
export function aFila({ ultimaRevision, proximaRevision, ultimoEjercicioId, ...resto }: ProgresoSync) {
  return {
    ...resto,
    ultimaRevision: ultimaRevision ? new Date(ultimaRevision) : null,
    proximaRevision: new Date(proximaRevision),
    ultimoEjercicioId: ultimoEjercicioId ?? null,
  };
}

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Guarda los intentos (un id que ya existe se ignora: reenviar no duplica) y, de cada ficha, el progreso
   * con la revisión más reciente, sea el guardado o el que llega. Devuelve el progreso consolidado del
   * usuario, de todas sus fichas: así un dispositivo nuevo recupera lo hecho en otro.
   */
  async sincronizar(usuarioId: string, { intentos, progreso }: PeticionSync): Promise<RespuestaSync> {
    if (intentos.length > 0) {
      await this.prisma.intento.createMany({
        data: intentos.map((i) => ({ ...i, usuarioId, respondidoEn: new Date(i.respondidoEn) })),
        skipDuplicates: true,
      });
    }
    const guardado = (await this.prisma.progresoFicha.findMany({ where: { usuarioId } })).map(aProgresoSync);
    const consolidado = fusionarProgreso(guardado, progreso);
    const antes = new Map(guardado.map((p) => [p.fichaId, p]));
    const cambiados = consolidado.filter((p) => !mismoJson(antes.get(p.fichaId), p));
    if (cambiados.length > 0) {
      await this.prisma.$transaction(
        cambiados.map((p) =>
          this.prisma.progresoFicha.upsert({
            where: { usuarioId_fichaId: { usuarioId, fichaId: p.fichaId } },
            create: { usuarioId, ...aFila(p) },
            update: aFila(p),
          }),
        ),
      );
    }
    return { progreso: consolidado };
  }
}
