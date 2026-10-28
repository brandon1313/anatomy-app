import { type Racha, RespuestaSync } from "@anatomia/contenido";
import type { Progreso } from "../repaso/espaciado";
import { api, ErrorApi } from "./api";
import {
  borrarIntentos,
  borrarReporte,
  confirmarRacha,
  confirmarSubida,
  guardarDelServidor,
  guardarRachaDelServidor,
  intentosPorSubir,
  leerProgreso,
  leerRacha,
  progresoPorSubir,
  rachaPorSubir,
  reportesPorEnviar,
} from "./registro";

const LOTE_INTENTOS = 200;
const LOTE_PROGRESO = 500;

export interface Sincronizado {
  progreso: Progreso[];
  racha: Racha | null;
}

let enCurso: Promise<Sincronizado> | null = null;
let otraVez: Promise<Sincronizado> | null = null;

/**
 * Envía los reportes de error pendientes a /reportes; después sube a /sync los intentos, el progreso y la
 * racha pendientes, en lotes, y guarda lo consolidado que devuelve el servidor (en el progreso gana la
 * revisión más reciente; las rachas se unen). Devuelve el progreso y la racha locales resultantes. Sin
 * conexión falla y todo queda pendiente para la próxima vez.
 */
export function sincronizar(usuarioId: string): Promise<Sincronizado> {
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

async function subir(usuarioId: string): Promise<Sincronizado> {
  for (const reporte of await reportesPorEnviar(usuarioId)) {
    try {
      await api("/reportes", { metodo: "POST", cuerpo: reporte });
    } catch (e) {
      // Un reporte que el servidor rechaza por inválido no se puede arreglar desde aquí: se descarta para
      // que no trabe las siguientes subidas. Sin conexión, sesión vencida o error del servidor, queda.
      const invalido = e instanceof ErrorApi && e.estado >= 400 && e.estado < 500 && e.estado !== 401 && e.estado !== 429;
      if (!invalido) throw e;
    }
    await borrarReporte(reporte.id);
  }
  for (;;) {
    const intentos = await intentosPorSubir(usuarioId, LOTE_INTENTOS);
    const progreso = (await progresoPorSubir(usuarioId)).slice(0, LOTE_PROGRESO);
    const racha = await rachaPorSubir(usuarioId);
    const r = RespuestaSync.parse(await api("/sync", { metodo: "POST", cuerpo: { intentos, progreso, racha: racha ?? undefined } }));
    await borrarIntentos(intentos.map((i) => i.id));
    await confirmarSubida(usuarioId, progreso);
    if (racha) await confirmarRacha(usuarioId, racha);
    if (intentos.length < LOTE_INTENTOS && progreso.length < LOTE_PROGRESO) {
      await guardarDelServidor(usuarioId, r.progreso);
      if (r.racha) await guardarRachaDelServidor(usuarioId, r.racha);
      return { progreso: await leerProgreso(usuarioId), racha: await leerRacha(usuarioId) };
    }
  }
}
