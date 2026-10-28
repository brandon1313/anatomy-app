import { RespuestaSync } from "@anatomia/contenido";
import type { Progreso } from "../repaso/espaciado";
import { api } from "./api";
import { borrarIntentos, confirmarSubida, guardarDelServidor, intentosPorSubir, leerProgreso, progresoPorSubir } from "./registro";

const LOTE_INTENTOS = 200;
const LOTE_PROGRESO = 500;
let enCurso: Promise<Progreso[]> | null = null;
let otraVez: Promise<Progreso[]> | null = null;

/**
 * Sube a /sync los intentos y el progreso pendientes, en lotes, y guarda el progreso consolidado que
 * devuelve el servidor (gana la revisión más reciente). Devuelve el progreso local resultante.
 * Sin conexión falla y todo queda pendiente para la próxima vez.
 */
export function sincronizar(usuarioId: string): Promise<Progreso[]> {
  if (!enCurso) {
    enCurso = subir(usuarioId).finally(() => (enCurso = null));
    return enCurso;
  }
  // Ya hay una en curso: lo que cambió mientras tanto sube en una más, que comparten los que pidan ahora.
  otraVez ??= enCurso
    .catch(() => {})
    .then(() => {
      otraVez = null;
      return sincronizar(usuarioId);
    });
  return otraVez;
}

async function subir(usuarioId: string): Promise<Progreso[]> {
  for (;;) {
    const intentos = await intentosPorSubir(usuarioId, LOTE_INTENTOS);
    const progreso = (await progresoPorSubir(usuarioId)).slice(0, LOTE_PROGRESO);
    const r = RespuestaSync.parse(await api("/sync", { metodo: "POST", cuerpo: { intentos, progreso } }));
    await borrarIntentos(intentos.map((i) => i.id));
    await confirmarSubida(usuarioId, progreso);
    if (intentos.length < LOTE_INTENTOS && progreso.length < LOTE_PROGRESO) {
      await guardarDelServidor(usuarioId, r.progreso);
      return leerProgreso(usuarioId);
    }
  }
}
