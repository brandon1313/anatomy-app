import type { Ejercicio, ProgresoSync } from "@anatomia/contenido";
import { type Card, createEmptyCard, fsrs, generatorParameters, Rating, type State } from "ts-fsrs";
import { aReloj, inicioDelDia } from "./dia";

/**
 * Repaso espaciado por ficha, en el dispositivo (PRD, "Repaso, racha y recordatorios"). Todo es puro:
 * recibe la hora y el progreso, y devuelve el progreso nuevo; guardarlo y subirlo es de otros módulos.
 */
export type Progreso = ProgresoSync;

// Sin pasos de aprendizaje en el mismo día: la app se usa una vez al día, así que el repaso se programa
// en días desde la primera vez (con pasos de minutos, una ficha recién vista quedaría vencida enseguida).
const planificador = fsrs(generatorParameters({ enable_short_term: false }));

// Los días son días de estudio (dia.ts): al planificador le llegan horas de reloj, y una ficha vence al
// empezar su día, no a la hora exacta: lo que se estudió de noche se puede repasar a la mañana siguiente.

/** En el mismo orden que el enum State de ts-fsrs. */
const ESTADOS = ["nuevo", "aprendiendo", "repaso", "reaprendiendo"] as const;

function aTarjeta(p: Progreso): Card {
  return {
    due: new Date(p.proximaRevision),
    stability: p.estabilidad,
    difficulty: p.dificultad,
    elapsed_days: 0,
    scheduled_days: p.diasProgramados,
    learning_steps: p.pasosAprendizaje,
    reps: p.repeticiones,
    lapses: p.lapsos,
    state: ESTADOS.indexOf(p.estado) as State,
    last_review: p.ultimaRevision ? aReloj(new Date(p.ultimaRevision)) : undefined,
  };
}

/** `c` salió del planificador con horas de reloj; lo que se guarda son instantes reales. */
function deTarjeta(fichaId: string, c: Card, ahora: Date, ultimoEjercicioId: string): Progreso {
  return {
    fichaId,
    estado: ESTADOS[c.state],
    estabilidad: c.stability,
    dificultad: c.difficulty,
    diasProgramados: c.scheduled_days,
    pasosAprendizaje: c.learning_steps,
    repeticiones: c.reps,
    lapsos: c.lapses,
    ultimaRevision: ahora.toISOString(),
    proximaRevision: inicioDelDia(ahora, c.scheduled_days).toISOString(),
    ultimoEjercicioId,
  };
}

export interface CalificacionFicha {
  /** Acertó todos los ejercicios de la ficha en la sesión (Good); si falló alguno, Again. */
  correcto: boolean;
  /** El último ejercicio de la ficha en la sesión: el próximo repaso usa otro. */
  ultimoEjercicioId: string;
}

/**
 * Una calificación por ficha para toda la sesión: Again si falló algún ejercicio de la ficha (también en
 * la repetición del final), Good si acertó todos. Un ejercicio que ya no está en el paquete no cuenta.
 */
export function calificacionesDeSesion(
  respuestas: readonly { ejercicioId: string; correcto: boolean }[],
  ejercicios: ReadonlyMap<string, Pick<Ejercicio, "fichaIds">>,
): Map<string, CalificacionFicha> {
  const porFicha = new Map<string, CalificacionFicha>();
  for (const r of respuestas) {
    for (const fichaId of ejercicios.get(r.ejercicioId)?.fichaIds ?? []) {
      const previa = porFicha.get(fichaId);
      porFicha.set(fichaId, { correcto: (previa?.correcto ?? true) && r.correcto, ultimoEjercicioId: r.ejercicioId });
    }
  }
  return porFicha;
}

/**
 * Aplica las calificaciones de una sesión. Una ficha sin progreso es nueva: entra al repaso la primera
 * vez que aparece en una lección. Devuelve solo el progreso de las fichas de la sesión.
 */
export function aplicarSesion(
  progreso: ReadonlyMap<string, Progreso>,
  calificaciones: ReadonlyMap<string, CalificacionFicha>,
  ahora: Date,
): Progreso[] {
  const reloj = aReloj(ahora);
  return [...calificaciones].map(([fichaId, c]) => {
    const previo = progreso.get(fichaId);
    const tarjeta = previo ? aTarjeta(previo) : createEmptyCard(reloj);
    const { card } = planificador.next(tarjeta, reloj, c.correcto ? Rating.Good : Rating.Again);
    return deTarjeta(fichaId, card, ahora, c.ultimoEjercicioId);
  });
}

/** Fichas con el repaso vencido, de la más atrasada a la menos. */
export function vencidas(progreso: readonly Progreso[], ahora: Date): Progreso[] {
  const t = ahora.getTime();
  return progreso.filter((p) => Date.parse(p.proximaRevision) <= t).sort((a, b) => Date.parse(a.proximaRevision) - Date.parse(b.proximaRevision));
}

/** Días de repaso que faltan para que venza la próxima ficha (1 = mañana); null si no queda ninguna por vencer. */
export function diasHastaElProximo(progreso: readonly Progreso[], ahora: Date): number | null {
  const futuras = progreso.map((p) => Date.parse(p.proximaRevision)).filter((t) => t > ahora.getTime());
  if (futuras.length === 0) return null;
  const dias = (inicioDelDia(new Date(Math.min(...futuras))).getTime() - inicioDelDia(ahora).getTime()) / 86_400_000;
  return Math.max(1, Math.round(dias));
}

/**
 * Ejercicios de una sesión de repaso: un ejercicio por ficha vencida, distinto al de la última vez,
 * hasta `maximo`. Se elige entre los que la app puede mostrar (`mostrables`); una ficha sin ejercicios
 * en el paquete actual se salta. El mismo ejercicio no se repite aunque evalúe varias fichas.
 */
export function ejerciciosDeRepaso(progreso: readonly Progreso[], mostrables: readonly Ejercicio[], ahora: Date, maximo = 10): string[] {
  const porFicha = new Map<string, string[]>();
  for (const e of mostrables) for (const f of e.fichaIds) porFicha.set(f, [...(porFicha.get(f) ?? []), e.id]);
  const elegidos: string[] = [];
  for (const p of vencidas(progreso, ahora)) {
    if (elegidos.length >= maximo) break;
    const candidatos = (porFicha.get(p.fichaId) ?? []).filter((id) => !elegidos.includes(id));
    if (candidatos.length === 0) continue;
    // El que sigue al de la última vez, en orden fijo: así van rotando y, si hay más de uno, nunca repite.
    const ordenados = [...candidatos].sort();
    elegidos.push(ordenados.find((id) => id > (p.ultimoEjercicioId ?? "")) ?? ordenados[0]);
  }
  return elegidos;
}
