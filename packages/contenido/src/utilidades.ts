import { puntoEnZona, type SalidaGenerador, type Zona } from "./esquema-contenido";

type Punto = [number, number];

/** Tolerancia del toque, en coordenadas normalizadas (PRD: "a menos de 0.015 del borde"). */
export const TOLERANCIA_TOQUE = 0.015;

function distanciaASegmento([px, py]: Punto, [ax, ay]: Punto, [bx, by]: Punto): number {
  const dx = bx - ax;
  const dy = by - ay;
  const largo2 = dx * dx + dy * dy;
  // Proyección del punto sobre el segmento, recortada a sus extremos.
  const t = largo2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / largo2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Distancia mínima del punto al borde del polígono (también si el punto está dentro). */
export function distanciaABorde(punto: Punto, zona: Zona): number {
  const pts = zona.puntos as Punto[];
  let minima = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    minima = Math.min(minima, distanciaASegmento(punto, pts[j], pts[i]));
  }
  return minima;
}

/**
 * La zona que recibe el toque. `zonas` va en orden de dibujo: la última queda encima, así que
 * donde un músculo cubre a otro gana el de arriba.
 */
export function zonaTocada(punto: Punto, zonas: Zona[]): Zona | undefined {
  for (let i = zonas.length - 1; i >= 0; i--) {
    if (puntoEnZona(punto, zonas[i])) return zonas[i];
  }
  return undefined;
}

/**
 * Regla del toque del PRD, para zonas que pueden superponerse: acierta si la zona de más arriba
 * bajo el toque es la correcta, o si el toque no cae en ninguna zona y está a menos de la tolerancia
 * del borde de la correcta. Sin superposiciones equivale a la regla original ("dentro de la zona
 * correcta, o cerca de su borde sin caer dentro de otra").
 */
export function esToqueCorrecto(
  punto: Punto,
  idCorrecta: string,
  zonas: Zona[],
  tolerancia = TOLERANCIA_TOQUE,
): boolean {
  const tocada = zonaTocada(punto, zonas);
  if (tocada) return tocada.id === idCorrecta;
  const correcta = zonas.find((z) => z.id === idCorrecta);
  return correcta !== undefined && distanciaABorde(punto, correcta) < tolerancia;
}

/**
 * Revisión de la salida del generador antes de guardarla (zod ya validó cada objeto).
 * `fichasExistentes` son ids que ya están en la base y pueden referenciarse.
 */
export function erroresDeSalidaGenerador(salida: SalidaGenerador, fichasExistentes: Iterable<string> = []): string[] {
  const errores: string[] = [];
  const fichas = new Set([...fichasExistentes, ...salida.fichas.map((f) => f.id)]);
  const vistos = new Set<string>();

  for (const f of salida.fichas) {
    if (!f.referencias.some((r) => r.libro === "tortora")) errores.push(`Ficha ${f.id}: falta la referencia a Tortora`);
  }

  for (const e of salida.ejercicios) {
    if (vistos.has(e.id)) errores.push(`Ejercicio duplicado: ${e.id}`);
    vistos.add(e.id);
    for (const id of e.fichaIds) {
      if (!fichas.has(id)) errores.push(`Ejercicio ${e.id}: la ficha ${id} no existe`);
    }
    if ("opciones" in e) {
      const ids = e.opciones.map((o) => o.id);
      if (new Set(ids).size !== ids.length) errores.push(`Ejercicio ${e.id}: hay opciones con el mismo id`);
      if (!ids.includes(e.correcta)) errores.push(`Ejercicio ${e.id}: la respuesta correcta no está entre las opciones`);
    }
  }
  return errores;
}

/**
 * Une dos listas de progreso por ficha: de cada ficha gana el registro con la `ultimaRevision` más
 * reciente (PRD, "Sin internet y sincronización"); uno sin revisión pierde contra cualquiera que la
 * tenga. Con la misma fecha queda el de `a`. Sirve en la API (lo guardado contra lo que llega) y en el
 * dispositivo (lo local contra lo que devuelve /sync).
 */
export function fusionarProgreso<T extends { fichaId: string; ultimaRevision?: string }>(a: readonly T[], b: readonly T[]): T[] {
  const cuando = (p: T) => (p.ultimaRevision ? Date.parse(p.ultimaRevision) : -Infinity);
  const porFicha = new Map(a.map((p) => [p.fichaId, p]));
  for (const p of b) {
    const actual = porFicha.get(p.fichaId);
    if (!actual || cuando(p) > cuando(actual)) porFicha.set(p.fichaId, p);
  }
  return [...porFicha.values()];
}
