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
