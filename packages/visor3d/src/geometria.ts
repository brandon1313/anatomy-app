import type { Vista } from "./protocolo";

/** Cuánto girar (en radianes) para ir del ángulo `desde` al ángulo `hasta` por el lado más corto. */
export function giroMasCorto(desde: number, hasta: number): number {
  const d = (hasta - desde) % (2 * Math.PI);
  return d > Math.PI ? d - 2 * Math.PI : d <= -Math.PI ? d + 2 * Math.PI : d;
}

/**
 * Distancia de la cámara al centro del modelo para que, con ese campo de visión vertical (en grados)
 * y esa proporción de pantalla, un modelo de `alto` × `ancho` quepa entero con un 5 % de margen.
 * Suma medio ancho porque la cara más cercana del modelo queda más cerca que su centro.
 */
export function distanciaParaVer(alto: number, ancho: number, fovGrados: number, aspecto: number): number {
  const t = Math.tan((fovGrados * Math.PI) / 360);
  return 1.05 * Math.max(alto / 2 / t, ancho / 2 / (t * aspecto)) + ancho / 2;
}

type Vec3 = [number, number, number];

/**
 * Acercar hacia un punto y no hacia el centro: cuando la distancia de la cámara al objetivo pasa de
 * `antes` a `despues`, cámara y objetivo se corren juntos hacia `punto` (lo que queda bajo los dedos,
 * en el plano del objetivo) en la misma proporción. Devuelve ese corrimiento; alejarse lo invierte.
 */
export function corrimientoAlAcercar(objetivo: Vec3, punto: Vec3, antes: number, despues: number): Vec3 {
  const k = 1 - despues / antes;
  return [(punto[0] - objetivo[0]) * k, (punto[1] - objetivo[1]) * k, (punto[2] - objetivo[2]) * k];
}

/** El objetivo de la cámara dentro de la caja del modelo (centrada en el origen): moverse no lo pierde de vista. */
export function dentroDeLaCaja(objetivo: Vec3, tam: Vec3): Vec3 {
  return [0, 1, 2].map((e) => Math.min(tam[e] / 2, Math.max(-tam[e] / 2, objetivo[e]))) as Vec3;
}

/** Entrada y salida suaves para las animaciones de cámara (k de 0 a 1). */
export const suavizar = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

/**
 * Dónde buscar una estructura al tocar: primero el punto exacto; si ahí no hay nada, dos anillos de
 * 8 puntos a 9 y 18 px. Es la tolerancia del toque en 2D llevada a la pantalla.
 */
export function puntosDeBusqueda(x: number, y: number): [number, number][] {
  const puntos: [number, number][] = [[x, y]];
  for (const radio of [9, 18]) {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * 2 * Math.PI;
      puntos.push([x + radio * Math.cos(a), y + radio * Math.sin(a)]);
    }
  }
  return puntos;
}

/** Bytes de un texto en base64 (el `.bin` que llega por el puente). */
export function deBase64(b64: string): ArrayBuffer {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes.buffer;
}

/**
 * La vista que corresponde al ángulo de la cámara alrededor del eje vertical (el `theta` de Spherical:
 * 0 es de frente). Con el muslo derecho, mirar desde x negativo es mirar su cara lateral.
 */
export function vistaDeAngulo(theta: number): Vista {
  const grados = ((((theta * 180) / Math.PI) % 360) + 540) % 360 - 180; // entre -180 y 180
  if (Math.abs(grados) <= 45) return "ant";
  if (Math.abs(grados) >= 135) return "post";
  return grados > 0 ? "med" : "lat";
}

/** Índices de 0 a n-1 del centro hacia los extremos: para la etiqueta se prefiere la mitad del hueso. */
export function ordenDesdeElCentro(n: number): number[] {
  if (n <= 0) return [];
  const medio = Math.floor((n - 1) / 2);
  const orden = [medio];
  for (let d = 1; orden.length < n; d++) {
    if (medio - d >= 0) orden.push(medio - d);
    if (medio + d < n) orden.push(medio + d);
  }
  return orden;
}

/** Rejilla de lo que ya está ocupado en pantalla, para que las etiquetas no tapen lo resaltado ni se encimen. */
export class Ocupacion {
  private readonly celdas = new Set<number>();

  constructor(
    private readonly ancho: number,
    private readonly alto: number,
    private readonly celda = 10,
  ) {}

  private recorrer(x: number, y: number, w: number, h: number, f: (clave: number) => boolean | void): boolean {
    const x0 = Math.floor(x / this.celda), x1 = Math.floor((x + w) / this.celda);
    const y0 = Math.floor(y / this.celda), y1 = Math.floor((y + h) / this.celda);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) if (f(cy * 100000 + cx) === false) return false;
    return true;
  }

  marcar(x: number, y: number, w: number, h: number) {
    this.recorrer(x, y, w, h, (c) => void this.celdas.add(c));
  }

  /** ¿Cabe un rectángulo dentro de la pantalla sin pisar nada marcado? */
  libre(x: number, y: number, w: number, h: number): boolean {
    if (x < 0 || y < 0 || x + w > this.ancho || y + h > this.alto) return false;
    return this.recorrer(x, y, w, h, (c) => !this.celdas.has(c));
  }
}
