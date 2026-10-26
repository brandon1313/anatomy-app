import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config";

/**
 * Archivos públicos: imágenes de las láminas (y luego los paquetes publicados). En local se guardan
 * en ALMACEN_DIR y la API los sirve en /archivos/; en producción irán a un bucket tipo S3.
 * Las claves llevan el hash del contenido, así que nunca cambian y se pueden cachear para siempre.
 */
const CLAVE = /^[a-z0-9]+(?:[-/][a-z0-9]+)*\.(webp|png|svg|json)$/;

export const PREFIJO_ARCHIVOS = "/archivos/";

export function rutaLocal(clave: string): string {
  if (!CLAVE.test(clave)) throw new Error(`Clave de archivo inválida: ${clave}`);
  return path.join(config.ALMACEN_DIR, clave);
}

export async function guardarArchivo(clave: string, contenido: Buffer | string): Promise<void> {
  const ruta = rutaLocal(clave);
  await mkdir(path.dirname(ruta), { recursive: true });
  await writeFile(ruta, contenido);
}
