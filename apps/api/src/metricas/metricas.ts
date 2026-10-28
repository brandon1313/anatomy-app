import { numeroDeDia } from "@anatomia/contenido";

/** Días de estudio ("YYYY-MM-DD", con el corte de las 4 a. m. de la app) de un estudiante. */
export interface ActividadEstudiante {
  registro: string;
  hoy: string;
  dias: string[];
}

export interface Retencion {
  /** Estudiantes cuyo día N ya terminó. */
  elegibles: number;
  /** De ellos, los que tuvieron actividad ese día. */
  retenidos: number;
}

export interface FilaAcierto {
  ejercicioId: string;
  intentos: number;
  correctos: number;
}

/** Debajo de este acierto, el ejercicio puede tener un error o estar mal redactado (PRD). */
export const ACIERTO_BAJO = 0.3;
/** Con menos intentos, un acierto bajo es ruido. */
export const INTENTOS_MINIMOS = 5;

function retencion(estudiantes: ActividadEstudiante[], dia: number): Retencion {
  const elegibles = estudiantes.filter((e) => numeroDeDia(e.hoy) > numeroDeDia(e.registro) + dia);
  const retenidos = elegibles.filter((e) => e.dias.some((d) => numeroDeDia(d) === numeroDeDia(e.registro) + dia));
  return { elegibles: elegibles.length, retenidos: retenidos.length };
}

/** Retención día 1 y 7, nuevos y activos de los últimos 7 días y el promedio de días activos de esos activos. */
export function resumenActividad(estudiantes: ActividadEstudiante[]) {
  const semana = (e: ActividadEstudiante, d: string) => numeroDeDia(e.hoy) - numeroDeDia(d) < 7;
  const diasEnLaSemana = estudiantes.map((e) => e.dias.filter((d) => semana(e, d)).length).filter((n) => n > 0);
  return {
    total: estudiantes.length,
    nuevos7d: estudiantes.filter((e) => semana(e, e.registro)).length,
    activos7d: diasEnLaSemana.length,
    diasActivosPorSemana: diasEnLaSemana.length ? diasEnLaSemana.reduce((a, b) => a + b, 0) / diasEnLaSemana.length : null,
    retencionD1: retencion(estudiantes, 1),
    retencionD7: retencion(estudiantes, 7),
  };
}

/** Acierto por ejercicio, el más bajo primero, marcando los que conviene revisar. */
export function aciertoPorEjercicio(filas: FilaAcierto[]) {
  return filas
    .map((f) => ({ ...f, acierto: f.correctos / f.intentos }))
    .map((f) => ({ ...f, revisar: f.intentos >= INTENTOS_MINIMOS && f.acierto < ACIERTO_BAJO }))
    .sort((a, b) => a.acierto - b.acierto || b.intentos - a.intentos);
}
