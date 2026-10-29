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

/** Todos los ejercicios del paquete que se pueden mostrar: de ahí sale la sesión de repaso. */
export const ejerciciosMostrables = (p: PaqueteContenido, imagenDisponible?: (archivo: string) => boolean): Ejercicio[] =>
  ejerciciosDeLeccion(p, { id: "todos", titulo: "Todos", orden: 0, ejercicioIds: p.ejercicios.map((e) => e.id) }, imagenDisponible);

/**
 * Junta los ejercicios que usan el mismo modelo 3D (el de la imagen de cada uno), para que el repaso
 * cambie de región las menos veces posibles. Los grupos van en el orden en que aparece su primer
 * ejercicio, y dentro de cada grupo se respeta el orden original.
 */
export function agruparPorModelo(p: PaqueteContenido, ids: readonly string[]): string[] {
  const porId = new Map(p.ejercicios.map((e) => [e.id, e]));
  const imagenes = new Map(p.imagenes.map((i) => [i.id, i]));
  const grupos = new Map<string, string[]>();
  for (const id of ids) {
    const e = porId.get(id);
    const clave = (e && "imagenId" in e && imagenes.get(e.imagenId)?.modelo3d?.archivo) || "";
    grupos.set(clave, [...(grupos.get(clave) ?? []), id]);
  }
  return [...grupos.values()].flat();
}

export function lecciones(p: PaqueteContenido): TLeccion[] {
  return [...p.curso.unidades]
    .sort((a, b) => a.orden - b.orden)
    .flatMap((u) => [...u.lecciones].sort((a, b) => a.orden - b.orden));
}

/**
 * Las unidades en orden, cada una con sus lecciones y `desde`: la posición de su primera lección en
 * `lecciones(p)`. Desbloquear sigue el camino completo: la unidad 2 se abre al terminar la 1.
 */
export function unidadesConLecciones(p: PaqueteContenido) {
  let desde = 0;
  return [...p.curso.unidades]
    .sort((a, b) => a.orden - b.orden)
    .map((u) => {
      const ls = [...u.lecciones].sort((a, b) => a.orden - b.orden);
      const unidad = { id: u.id, titulo: u.titulo, lecciones: ls, desde };
      desde += ls.length;
      return unidad;
    });
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
/**
 * Respuestas dadas sobre las que hacen falta: los ejercicios más la repetición de cada fallado, que se
 * sabe desde que se falla. Así la barra avanza al comprobar, llega a 1 con la última respuesta y nunca
 * retrocede cuando las repeticiones se agregan al final.
 */
export const progreso = (s: Sesion) => {
  const total = s.original + s.fallados.length;
  return total === 0 ? 1 : Math.min(1, s.respuestas.length / total);
};

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
