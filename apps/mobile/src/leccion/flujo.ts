import type { Ejercicio, Leccion, PaqueteContenido } from "@anatomia/contenido";
import type { z } from "zod";

export type TLeccion = z.infer<typeof Leccion>;

/** Tipos que la app sabe mostrar. Un tipo nuevo en un paquete se salta en vez de romper la lección. */
const SOPORTADOS = new Set<Ejercicio["tipo"]>(["opcion_multiple", "caso_clinico", "emparejar", "identificar_imagen", "tocar_estructura"]);

/**
 * Ejercicios de la lección que se pueden mostrar. Se saltan los que el paquete ya no trae y los de
 * imagen cuya imagen falta o no está descargada (`imagenDisponible` recibe la clave del archivo).
 */
export function ejerciciosDeLeccion(
  p: PaqueteContenido,
  leccion: TLeccion,
  imagenDisponible: (archivo: string) => boolean = () => true,
): Ejercicio[] {
  const porId = new Map(p.ejercicios.map((e) => [e.id, e]));
  const imagenes = new Map(p.imagenes.map((i) => [i.id, i]));
  return leccion.ejercicioIds.flatMap((id) => {
    const e = porId.get(id);
    if (!e || !SOPORTADOS.has(e.tipo)) return [];
    if ("imagenId" in e) {
      const imagen = imagenes.get(e.imagenId);
      if (!imagen || !imagenDisponible(imagen.archivo)) return [];
    }
    return [e];
  });
}

export function lecciones(p: PaqueteContenido): TLeccion[] {
  return [...p.curso.unidades]
    .sort((a, b) => a.orden - b.orden)
    .flatMap((u) => [...u.lecciones].sort((a, b) => a.orden - b.orden));
}

/** Una lección se desbloquea al completar la anterior. */
export function estadoLeccion(todas: TLeccion[], i: number, completadas: string[]): "completada" | "siguiente" | "bloqueada" {
  if (completadas.includes(todas[i].id)) return "completada";
  return i === 0 || completadas.includes(todas[i - 1].id) ? "siguiente" : "bloqueada";
}

// ───────────── Flujo de una sesión ─────────────

export interface Respuesta {
  ejercicioId: string;
  correcto: boolean;
  ms: number;
  /** true en la repetición de un fallado al final. */
  repeticion: boolean;
}

export interface Sesion {
  cola: string[];
  /** Cuántos ejercicios tiene la primera pasada; lo que sigue son repeticiones. */
  original: number;
  indice: number;
  /** Fallados en la primera pasada; se agregan una vez al final. */
  fallados: string[];
  repetidos: boolean;
  respuestas: Respuesta[];
}

export function iniciar(ejercicioIds: string[]): Sesion {
  return { cola: [...ejercicioIds], original: ejercicioIds.length, indice: 0, fallados: [], repetidos: false, respuestas: [] };
}

export const actual = (s: Sesion): string | undefined => s.cola[s.indice];
export const terminada = (s: Sesion) => s.indice >= s.cola.length;
export const progreso = (s: Sesion) => (s.cola.length === 0 ? 1 : Math.min(1, s.indice / s.cola.length));

export function responder(s: Sesion, correcto: boolean, ms: number): Sesion {
  const id = actual(s);
  if (id === undefined) return s;
  const repeticion = s.indice >= s.original;
  return {
    ...s,
    fallados: !correcto && !repeticion && !s.fallados.includes(id) ? [...s.fallados, id] : s.fallados,
    respuestas: [...s.respuestas, { ejercicioId: id, correcto, ms, repeticion }],
  };
}

export function siguiente(s: Sesion): Sesion {
  const indice = s.indice + 1;
  if (indice >= s.cola.length && !s.repetidos && s.fallados.length > 0) {
    return { ...s, indice, cola: [...s.cola, ...s.fallados], repetidos: true };
  }
  return { ...s, indice };
}

/** Aciertos a la primera sobre el total de ejercicios distintos. */
export function resultado(s: Sesion) {
  const primera = s.respuestas.filter((r) => !r.repeticion);
  return {
    aciertos: primera.filter((r) => r.correcto).length,
    total: primera.length,
    ms: s.respuestas.reduce((t, r) => t + r.ms, 0),
  };
}

// ───────────── Ejercicios ─────────────

/** Fisher–Yates; `azar` se inyecta para poder probarlo. */
export function barajar<T>(xs: readonly T[], azar: () => number = Math.random): T[] {
  const copia = [...xs];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * `uniones[i]` es el índice (en `pares`) del texto derecho que el estudiante unió con el izquierdo i.
 * Se compara por texto, por si dos pares tienen la misma derecha.
 */
export function calificarEmparejar(pares: { izquierda: string; derecha: string }[], uniones: number[]) {
  const incorrectos = pares.flatMap((p, i) => (pares[uniones[i]]?.derecha === p.derecha ? [] : [i]));
  return { correcto: incorrectos.length === 0, incorrectos };
}
