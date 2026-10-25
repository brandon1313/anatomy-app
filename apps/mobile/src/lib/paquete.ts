import { PaqueteContenido } from "@anatomia/contenido";
import { api } from "./api";
import { guardarJson, leerJson } from "./almacen";

const CLAVE = "paquete";

export const paqueteLocal = () => leerJson<PaqueteContenido>(CLAVE);

/**
 * Pregunta al servidor si hay una versión más nueva que la local. Si la hay, la valida con
 * PaqueteContenido y solo entonces reemplaza la copia local. Devuelve el paquete vigente.
 * Errores de red se propagan; quien llama decide seguir con la copia local.
 */
export async function actualizarPaquete(local: PaqueteContenido | null): Promise<PaqueteContenido | null> {
  const r = await api<{ version: number; contenido?: unknown }>(`/paquete/actual?desde=${local?.version ?? 0}`);
  if (!r.contenido) return local;
  const nuevo = PaqueteContenido.safeParse(r.contenido);
  if (!nuevo.success) throw new Error(`El paquete ${r.version} no es válido`);
  await guardarJson(CLAVE, nuevo.data);
  return nuevo.data;
}
