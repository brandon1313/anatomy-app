import { URL_API } from "./api";

/** En web (solo para desarrollo) la imagen se pide a la API y la cachea el navegador. */
export function uriImagen(clave: string): string | null {
  return `${URL_API}/archivos/${clave}`;
}

export async function descargarImagen(_clave: string): Promise<void> {}

export function alDescargarArchivo(_f: (clave: string) => void): () => void {
  return () => {};
}
