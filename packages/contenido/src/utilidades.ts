import { type MarcaLeccion, type OfertaPremium, puntoEnZona, type Racha, type SalidaGenerador, type Zona } from "./esquema-contenido";

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

/** El número de un día "AAAA-MM-DD" (días desde 1970): la resta de dos da los días entre ellos. */
export const numeroDeDia = (dia: string) => Math.round(Date.parse(`${dia}T00:00:00Z`) / 86_400_000);

/**
 * Une dos rachas del mismo estudiante, como la del servidor y la de un teléfono que estuvo sin conexión.
 * Cada una es un tramo de días seguidos que termina en `ultimoDia`: si los tramos se tocan o se pisan, la
 * racha es su unión; si entre ellos quedó un día sin actividad, cuenta solo el más reciente. La máxima es
 * la mayor de las dos (o la unión, si es más larga).
 */
export function fusionarRacha(a: Racha, b: Racha): Racha {
  const tramo = (r: Racha) => (r.ultimoDia && r.actual > 0 ? { fin: numeroDeDia(r.ultimoDia), inicio: numeroDeDia(r.ultimoDia) - r.actual + 1 } : null);
  const [ta, tb] = [tramo(a), tramo(b)];
  let r = ta ? a : b;
  if (ta && tb) {
    const [antes, despues, ultima] = ta.fin <= tb.fin ? [ta, tb, b] : [tb, ta, a];
    const actual = antes.fin + 1 >= despues.inicio ? despues.fin - Math.min(antes.inicio, despues.inicio) + 1 : ultima.actual;
    r = { ...ultima, actual };
  }
  return { ...r, maxima: Math.max(a.maxima, b.maxima, r.actual) };
}

/**
 * Estrellas de una lección según los aciertos a la primera: 1 por terminarla, 2 desde el 70% y 3 desde el
 * 90%. Sin ejercicios, 0.
 */
export function estrellas(aciertos: number, total: number): 0 | 1 | 2 | 3 {
  if (total <= 0) return 0;
  if (aciertos >= total * 0.9) return 3;
  if (aciertos >= total * 0.7) return 2;
  return 1;
}

/**
 * true si la marca `a` es mejor que `b`: más aciertos en proporción; si empatan, la de más ejercicios y,
 * después, la lograda antes. Es un orden total: el teléfono y el servidor eligen la misma.
 */
export function esMejorMarca(a: MarcaLeccion, b: MarcaLeccion): boolean {
  const proporcion = a.aciertos * b.total - b.aciertos * a.total;
  if (proporcion !== 0) return proporcion > 0;
  if (a.total !== b.total) return a.total > b.total;
  return a.logrado < b.logrado;
}

/** Une las marcas de dos lugares (el teléfono y el servidor): de cada lección queda la mejor. */
export function fusionarMarcas(a: readonly MarcaLeccion[], b: readonly MarcaLeccion[]): MarcaLeccion[] {
  const porLeccion = new Map(a.map((m) => [m.leccionId, m]));
  for (const m of b) {
    const actual = porLeccion.get(m.leccionId);
    if (!actual || esMejorMarca(m, actual)) porLeccion.set(m.leccionId, m);
  }
  return [...porLeccion.values()];
}

/**
 * Prueba A/B del primer beneficio de Premium (docs/PLAN-PREMIUM.md): "a" muestra los beneficios en el orden
 * configurado y "b" pone el segundo primero. Sale del id del usuario, así que el teléfono y el servidor
 * eligen lo mismo, también sin conexión, y cada estudiante ve siempre la misma.
 */
export type VarianteOferta = "a" | "b";
export const varianteOferta = (usuarioId: string): VarianteOferta => (parseInt(usuarioId.charAt(0), 16) % 2 === 0 ? "a" : "b");

/** La oferta como la ve esa variante: en "b", el segundo beneficio pasa a ser el primero. */
export function ofertaParaVariante<T extends Pick<OfertaPremium, "beneficios">>(oferta: T, variante: VarianteOferta): T {
  const [primero, segundo, ...resto] = oferta.beneficios;
  return variante === "b" && segundo ? { ...oferta, beneficios: [segundo, primero, ...resto] } : oferta;
}

/** Cuánto se ahorra, en porcentaje entero, pagando el año en vez de 12 meses (0 si no conviene). */
export const ahorroAnual = (o: Pick<OfertaPremium, "mensual" | "anual">) => Math.max(0, Math.round((1 - o.anual / (o.mensual * 12)) * 100));
