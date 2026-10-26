import { Directory, File, Paths } from "expo-file-system";
import { URL_API } from "./api";

/**
 * Imágenes del paquete guardadas en el dispositivo, para que las lecciones funcionen sin conexión.
 * La clave es la del almacén de la API ("imagenes/x-<hash>.webp"): nunca cambia de contenido.
 */
const carpeta = new Directory(Paths.document, "anatomia", "archivos");
const local = (clave: string) => new File(carpeta, ...clave.split("/"));

/** URI para mostrar la imagen, o null si todavía no se descargó. */
export function uriImagen(clave: string): string | null {
  const f = local(clave);
  return f.exists ? f.uri : null;
}

/**
 * Descarga la imagen si falta. Primero a un temporal y luego la mueve: si la descarga se corta
 * no queda un archivo a medias con el nombre final. Un error HTTP rechaza la promesa.
 */
export async function descargarImagen(clave: string): Promise<void> {
  const destino = local(clave);
  if (destino.exists) return;
  destino.parentDirectory.create({ intermediates: true, idempotent: true });
  const temporal = new File(destino.parentDirectory, `${destino.name}.descarga`);
  await File.downloadFileAsync(`${URL_API}/archivos/${clave}`, temporal, { idempotent: true });
  await temporal.move(destino, { overwrite: true });
}
