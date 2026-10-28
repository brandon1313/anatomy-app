import { fusionarProgreso, fusionarRacha, type PeticionSync, type ProgresoSync, type Racha, type RespuestaSync } from "@anatomia/contenido";
import { Injectable } from "@nestjs/common";
import type { ProgresoFicha as FilaProgreso, Racha as FilaRacha } from "@prisma/client";
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

/** La fila de rachas como viaja en /sync. */
export const aRacha = (f: FilaRacha): Racha => ({ actual: f.actual, maxima: f.maxima, ultimoDia: f.ultimoDia ?? undefined });

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Guarda los intentos (un id que ya existe se ignora: reenviar no duplica) y, de cada ficha, el progreso
   * con la revisión más reciente, sea el guardado o el que llega; la racha que llega se une con la guardada.
   * Devuelve el progreso consolidado del usuario, de todas sus fichas, y su racha: así un dispositivo nuevo
   * recupera lo hecho en otro.
   */
  async sincronizar(usuarioId: string, { intentos, progreso, racha }: PeticionSync): Promise<RespuestaSync> {
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
    return { progreso: consolidado, racha: await this.consolidarRacha(usuarioId, racha) };
  }

  /** La racha guardada unida con la que llega (fusionarRacha); undefined si el usuario todavía no tiene. */
  private async consolidarRacha(usuarioId: string, llega?: Racha): Promise<Racha | undefined> {
    const fila = await this.prisma.racha.findUnique({ where: { usuarioId } });
    const guardada = fila ? aRacha(fila) : undefined;
    if (!llega) return guardada;
    const racha = guardada ? fusionarRacha(guardada, llega) : llega;
    if (!mismoJson(guardada, racha)) {
      const datos = { actual: racha.actual, maxima: racha.maxima, ultimoDia: racha.ultimoDia ?? null };
      await this.prisma.racha.upsert({ where: { usuarioId }, create: { usuarioId, ...datos }, update: datos });
    }
    return racha;
  }
}
