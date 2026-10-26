import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

/** Ancho de la imagen que descarga la app: cubre el ancho de un teléfono a 3x. */
export const ANCHO_IMAGEN = 1200;

/** SVG → WebP. A calidad 88 no se distingue del PNG y pesa unas 14 veces menos (~230 KB por capa). */
export async function renderizarWebp(svg: string): Promise<{ webp: Buffer; ancho: number; alto: number }> {
  const imagen = new Resvg(svg, { fitTo: { mode: "width", value: ANCHO_IMAGEN } }).render();
  const webp = await sharp(imagen.asPng()).webp({ quality: 88, effort: 6 }).toBuffer();
  return { webp, ancho: imagen.width, alto: imagen.height };
}
