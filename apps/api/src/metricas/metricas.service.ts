import type { Ejercicio } from "@anatomia/contenido";
import { Injectable } from "@nestjs/common";
import { tituloEjercicio } from "../contenido/contenido.service";
import { PrismaService } from "../prisma/prisma.service";
import { type ActividadEstudiante, aciertoPorEjercicio, type FilaAcierto, resumenActividad } from "./metricas";

/**
 * Día de estudio local de un timestamp guardado en UTC, con el corte de las 4 a. m. de la app
 * (apps/mobile/src/repaso/dia.ts).
 */
const DIA = (columna: string) =>
  `to_char(((${columna} AT TIME ZONE 'UTC' AT TIME ZONE u.zona_horaria) - interval '4 hours')::date, 'YYYY-MM-DD')`;

/** Métricas de la beta (PRD, "Medición de la beta"). Solo cuentan los estudiantes: el equipo no. */
@Injectable()
export class MetricasService {
  constructor(private readonly prisma: PrismaService) {}

  async calcular() {
    const [actividad, eventos, aciertos, [conteos], premium] = await Promise.all([
      this.prisma.$queryRawUnsafe<ActividadEstudiante[]>(`
        SELECT ${DIA("u.creado")} AS registro,
               to_char(((now() AT TIME ZONE u.zona_horaria) - interval '4 hours')::date, 'YYYY-MM-DD') AS hoy,
               coalesce(array_agg(DISTINCT ${DIA("a.t")}) FILTER (WHERE a.t IS NOT NULL), '{}') AS dias
        FROM usuarios u
        LEFT JOIN (SELECT usuario_id, respondido_en AS t FROM intentos UNION ALL SELECT usuario_id, creado FROM eventos) a
          ON a.usuario_id = u.id
        WHERE u.rol = 'estudiante'
        GROUP BY u.id`),
      this.prisma.$queryRaw<{ nombre: string; total: number; usuarios: number }[]>`
        SELECT v.nombre, count(*)::int AS total, count(DISTINCT v.usuario_id)::int AS usuarios
        FROM eventos v JOIN usuarios u ON u.id = v.usuario_id AND u.rol = 'estudiante'
        GROUP BY v.nombre`,
      this.prisma.$queryRaw<FilaAcierto[]>`
        SELECT i.ejercicio_id AS "ejercicioId", count(*)::int AS intentos, (count(*) FILTER (WHERE i.correcto))::int AS correctos
        FROM intentos i JOIN usuarios u ON u.id = i.usuario_id AND u.rol = 'estudiante'
        GROUP BY i.ejercicio_id`,
      this.prisma.$queryRaw<{ reportes: number }[]>`
        SELECT count(*)::int AS reportes
        FROM reportes_error r JOIN usuarios u ON u.id = r.usuario_id AND u.rol = 'estudiante'`,
      this.prisma.$queryRaw<{ plan: string; usuarios: number }[]>`
        SELECT p.plan, count(DISTINCT p.usuario_id)::int AS usuarios
        FROM interes_premium p JOIN usuarios u ON u.id = p.usuario_id AND u.rol = 'estudiante'
        GROUP BY p.plan`,
    ]);

    const evento = (nombre: string) => {
      const { total = 0, usuarios = 0 } = eventos.find((e) => e.nombre === nombre) ?? {};
      return { total, usuarios };
    };
    const filas = aciertoPorEjercicio(aciertos);
    const ejercicios = await this.prisma.ejercicio.findMany({ where: { id: { in: filas.map((f) => f.ejercicioId) } } });
    const porId = new Map(ejercicios.map((e) => [e.id, e]));
    const respuestas = aciertos.reduce((s, f) => ({ total: s.total + f.intentos, correctas: s.correctas + f.correctos }), { total: 0, correctas: 0 });

    return {
      estudiantes: resumenActividad(actividad),
      lecciones: evento("leccion_completada"),
      repasos: evento("repaso_completado"),
      respuestas,
      reportes: conteos.reportes,
      premium: {
        vieron: evento("premium_visto").usuarios,
        interesados: evento("premium_interes").usuarios,
        porPlan: Object.fromEntries(premium.map((p) => [p.plan, p.usuarios])),
      },
      ejercicios: filas.map((f) => {
        const e = porId.get(f.ejercicioId);
        return { ...f, tipo: e?.tipo ?? null, titulo: e ? tituloEjercicio(e.data as Ejercicio) : null };
      }),
    };
  }
}

export type Metricas = Awaited<ReturnType<MetricasService["calcular"]>>;
