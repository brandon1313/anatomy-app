import { FichaMusculoBase, type Zona } from "@anatomia/contenido";

/**
 * Láminas vectoriales: un HTML con el dibujo en SVG (cada estructura es un <g class="part" data-id>)
 * y sus datos en `const P = {...}` (nombres, filas de ficha, contornos y qué se oculta en cada capa).
 * Ver contenido/laminas/. De ahí salen las imágenes, sus zonas y las fichas en borrador.
 */

export type Capa = "superficial" | "profunda";
export const CAPAS: Capa[] = ["superficial", "profunda"];

interface Estructura {
  name: string;
  latin: string;
  kind: "muscle" | "struct";
  group: string;
  rows: [string, string][];
}

interface DatosLamina {
  data: Record<string, Estructura>;
  ghosts: Record<string, string>;
  /**
   * Zonas por capa (las láminas generadas desde el 3D, contenido/laminas/generar.mjs): el contorno de lo que
   * se ve de cada músculo en esa capa. Un músculo sin entrada en una capa no tiene zona ahí. Sin esto se
   * usa `ghosts` en todas las capas donde el músculo no está oculto.
   */
  ghostsCapa?: Record<Capa, Record<string, string>>;
  hide: Record<Capa, string[]>;
}

export interface Lamina {
  /** x, y, ancho, alto del viewBox del dibujo. */
  viewBox: [number, number, number, number];
  css: string;
  defs: string;
  art: string;
  /** Ids de las estructuras en orden de dibujo (la última queda encima). */
  orden: string[];
  datos: DatosLamina;
}

function recortar(texto: string, desde: string, hasta: string): string {
  const i = texto.indexOf(desde);
  const j = i < 0 ? -1 : texto.indexOf(hasta, i);
  if (i < 0 || j < 0) throw new Error(`La lámina no tiene el formato esperado (falta "${i < 0 ? desde : hasta}")`);
  return texto.slice(i, j);
}

export function leerLamina(html: string): Lamina {
  const p = html.match(/^const P = (\{.*\});\s*$/m);
  if (!p) throw new Error("La lámina no tiene los datos `const P = {...}`");
  const svg = recortar(html, '<svg id="fig"', "</svg>");
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1].split(/\s+/).map(Number);
  if (viewBox?.length !== 4 || viewBox.some(Number.isNaN)) throw new Error("La lámina no tiene un viewBox válido");
  const art = recortar(svg, '<g id="art">', '<g id="focus">').trimEnd();
  return {
    viewBox: viewBox as Lamina["viewBox"],
    css: recortar(html, "/* drawing */", ".part{cursor:pointer"),
    defs: recortar(svg, "<defs>", "</defs>") + "</defs>",
    art,
    orden: [...art.matchAll(/<g class="part [^"]*" data-id="([^"]+)"/g)].map((m) => m[1]),
    datos: JSON.parse(p[1]) as DatosLamina,
  };
}

/** "recto_femoral" → "recto-femoral" (los ids del contenido usan guiones). */
export const slug = (id: string) => id.replace(/_/g, "-");

const musculos = (l: Lamina) => l.orden.filter((id) => l.datos.data[id]?.kind === "muscle");
const redondear = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 10000) / 10000;

/** Zonas de los músculos visibles en la capa, en orden de dibujo y normalizadas a 0–1 con el viewBox. */
export function zonasDeCapa(l: Lamina, capa: Capa): Zona[] {
  const [x0, y0, ancho, alto] = l.viewBox;
  const porCapa = l.datos.ghostsCapa?.[capa];
  return musculos(l)
    .filter((id) => !l.datos.hide[capa].includes(id) && (!porCapa || id in porCapa))
    .map((id) => ({
      id: `zona-${slug(id)}`,
      fichaId: slug(id),
      puntos: [...(porCapa?.[id] ?? l.datos.ghosts[id]).matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map(
        ([, x, y]) => [redondear((Number(x) - x0) / ancho), redondear((Number(y) - y0) / alto)] as [number, number],
      ),
    }));
}

/** SVG independiente de una capa: lleva los estilos del dibujo y oculta lo que no va en esa capa. */
export function svgDeCapa(l: Lamina, capa: Capa): string {
  const ocultas = new Set(l.datos.hide[capa]);
  const art = l.art
    .replace(/ tabindex="-1"/g, "")
    .replace(/<g class="part [^"]*" data-id="([^"]+)"/g, (inicio, id: string) => (ocultas.has(id) ? `${inicio} display="none"` : inicio));
  const [x, y, w, h] = l.viewBox;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}"><style>${l.css}</style>${l.defs}${art}</svg>`;
}

// ───────────── Fichas ─────────────

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Parte un texto de la lámina en elementos: por "; " y por fin de oración. */
function elementos(texto: string): string[] {
  return texto
    .split(/;\s+|\.\s+(?=[A-ZÁÉÍÓÚÑ])/)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter(Boolean)
    .map(mayuscula);
}

function fila(e: Estructura, nombre: string): string {
  const f = e.rows.find(([k]) => k === nombre);
  if (!f) throw new Error(`La estructura ${e.name} no tiene la fila "${nombre}"`);
  return f[1];
}

/**
 * Las fichas de los músculos de la lámina, en el formato del generador. Entran como borrador:
 * el texto de la lámina no está revisado.
 */
export function fichasDeLamina(l: Lamina, region: string): FichaMusculoBase[] {
  return musculos(l).map((id) => {
    const e = l.datos.data[id];
    const grupo = e.group.toLowerCase();
    return FichaMusculoBase.parse({
      id: slug(id),
      tipo: "musculo",
      nombre: { principal: e.name, latin: e.latin, sinonimos: [] },
      region,
      compartimento: grupo.match(/compartimento (anterior|medial|lateral|posterior)/)?.[1],
      origen: elementos(fila(e, "Origen")),
      insercion: elementos(fila(e, "Inserción")),
      inervacion: elementos(fila(e, "Inervación")).map((s) => {
        const m = s.match(/^(.*?)\s*\(([^)]+)\)$/);
        return m ? { nervio: m[1], raices: m[2] } : { nervio: s };
      }),
      acciones: elementos(fila(e, "Acción")),
      notaClinica: fila(e, "Dato clave"),
      referencias: [{ libro: "tortora" }],
    });
  });
}
