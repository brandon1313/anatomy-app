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
 * Regla del toque: acierta si cae dentro de la zona correcta, o si está a menos de la tolerancia
 * de su borde y no cae dentro de ninguna otra zona.
 */
export function esToqueCorrecto(
  punto: Punto,
  zonaCorrecta: Zona,
  otrasZonas: Zona[],
  tolerancia = TOLERANCIA_TOQUE,
): boolean {
  if (puntoEnZona(punto, zonaCorrecta)) return true;
  if (distanciaABorde(punto, zonaCorrecta) >= tolerancia) return false;
  return !otrasZonas.some((z) => z.id !== zonaCorrecta.id && puntoEnZona(punto, z));
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
