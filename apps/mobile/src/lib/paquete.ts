import { PaqueteContenido } from "@anatomia/contenido";
import { api } from "./api";
import { guardarJson, leerJson } from "./almacen";
import { descargarImagen } from "./imagenes";

const CLAVE = "paquete";

export const paqueteLocal = () => leerJson<PaqueteContenido>(CLAVE);

/** Imágenes y modelos 3D (la misma descarga sirve para cualquier archivo del almacén). */
async function descargarImagenes(p: PaqueteContenido) {
  const claves = new Set(p.imagenes.flatMap((i) => [i.archivo, ...(i.modelo3d ? [i.modelo3d.archivo, i.modelo3d.datos] : [])]));
  for (const clave of claves) await descargarImagen(clave);
}

/**
 * Pregunta al servidor si hay una versión más nueva que la local. Si la hay, la valida con
 * PaqueteContenido, descarga sus imágenes y solo entonces reemplaza la copia local (PRD: "solo si
 * todo llegó completo"). Si no hay versión nueva, completa las imágenes que le falten a la local.
 * Errores de red se propagan; quien llama decide seguir con la copia local.
 */
export async function actualizarPaquete(local: PaqueteContenido | null): Promise<PaqueteContenido | null> {
  const r = await api<{ version: number; contenido?: unknown }>(`/paquete/actual?desde=${local?.version ?? 0}`);
  if (!r.contenido) {
    if (local) await descargarImagenes(local);
    return local;
  }
  const nuevo = PaqueteContenido.safeParse(r.contenido);
  if (!nuevo.success) throw new Error(`El paquete ${r.version} no es válido`);
  await descargarImagenes(nuevo.data);
  await guardarJson(CLAVE, nuevo.data);
  return nuevo.data;
}
