import type { Zona } from "@anatomia/contenido";

/**
 * Geometría de los ejercicios de imagen. La imagen se muestra a todo el ancho y con su proporción,
 * sin bordes vacíos, así que las coordenadas normalizadas de las zonas coinciden directo (PRD).
 */

/** Toque en píxeles de la imagen mostrada → coordenadas 0–1 (x / ancho mostrado, y / alto mostrado). */
export function normalizar(x: number, y: number, ancho: number, alto: number): [number, number] {
  const recortar = (n: number) => Math.min(1, Math.max(0, n));
  return [recortar(x / ancho), recortar(y / alto)];
}

/** Puntos de la zona en píxeles de la imagen mostrada, en el formato de `points` de un polígono SVG. */
export function puntosEnPantalla(zona: Zona, ancho: number, alto: number): string {
  return zona.puntos.map(([x, y]) => `${Math.round(x * ancho * 10) / 10},${Math.round(y * alto * 10) / 10}`).join(" ");
}

/**
 * Desplazamiento vertical que centra la zona en la ventana sin pasarse de los bordes de la imagen.
 * `tambien` (y de 0 a 1, por ejemplo dónde tocó el estudiante) se incluye si cabe junto con la zona;
 * si no cabe, manda la zona.
 */
export function desplazamientoPara(zona: Zona, altoImagen: number, altoVentana: number, tambien?: number): number {
  const ys = zona.puntos.map(([, y]) => y);
  let centro = ((Math.min(...ys) + Math.max(...ys)) / 2) * altoImagen;
  if (tambien !== undefined) {
    const otro = tambien * altoImagen;
    // Cabe si, centrando entre los dos, ambos quedan a más de 10% del borde de la ventana.
    if (Math.abs(otro - centro) <= altoVentana * 0.8) centro = (otro + centro) / 2;
  }
  return Math.round(Math.max(0, Math.min(altoImagen - altoVentana, centro - altoVentana / 2)));
}
