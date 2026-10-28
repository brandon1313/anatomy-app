import { fusionarProgreso, fusionarRacha, type Intento, type NuevoReporte, type Racha } from "@anatomia/contenido";
import type { Progreso } from "../repaso/espaciado";

/**
 * En web (solo para desarrollo) el registro va en localStorage, con las mismas reglas que la versión de
 * SQLite (registro.ts): intentos y reportes por enviar, y progreso por ficha y racha con `pendiente`.
 */
type Fila = { datos: Progreso; pendiente: boolean };

const leer = <T,>(clave: string, vacio: T): T => {
  try {
    const s = localStorage.getItem(clave);
    return s ? (JSON.parse(s) as T) : vacio;
  } catch {
    return vacio;
  }
};
const escribir = (clave: string, valor: unknown) => {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin almacenamiento: dura lo que la pestaña.
  }
};
const claveIntentos = (u: string) => `anatomia.intentos.${u}`;
const claveProgreso = (u: string) => `anatomia.progreso.${u}`;

export async function guardarIntento(usuarioId: string, intento: Intento): Promise<void> {
  const intentos = leer<Intento[]>(claveIntentos(usuarioId), []);
  if (!intentos.some((i) => i.id === intento.id)) escribir(claveIntentos(usuarioId), [...intentos, intento]);
}

export async function intentosPorSubir(usuarioId: string, limite: number): Promise<Intento[]> {
  return leer<Intento[]>(claveIntentos(usuarioId), []).slice(0, limite);
}

export async function borrarIntentos(ids: string[]): Promise<void> {
  for (const k of Object.keys(localStorage).filter((k) => k.startsWith("anatomia.intentos."))) {
    escribir(k, leer<Intento[]>(k, []).filter((i) => !ids.includes(i.id)));
  }
}

export async function leerProgreso(usuarioId: string): Promise<Progreso[]> {
  return Object.values(leer<Record<string, Fila>>(claveProgreso(usuarioId), {})).map((f) => f.datos);
}

export async function guardarProgresoPropio(usuarioId: string, progreso: Progreso[]): Promise<void> {
  const filas = leer<Record<string, Fila>>(claveProgreso(usuarioId), {});
  for (const p of progreso) filas[p.fichaId] = { datos: p, pendiente: true };
  escribir(claveProgreso(usuarioId), filas);
}

export async function progresoPorSubir(usuarioId: string): Promise<Progreso[]> {
  return Object.values(leer<Record<string, Fila>>(claveProgreso(usuarioId), {}))
    .filter((f) => f.pendiente)
    .map((f) => f.datos);
}

export async function confirmarSubida(usuarioId: string, subido: Progreso[]): Promise<void> {
  const filas = leer<Record<string, Fila>>(claveProgreso(usuarioId), {});
  for (const p of subido) {
    const f = filas[p.fichaId];
    if (f && JSON.stringify(f.datos) === JSON.stringify(p)) f.pendiente = false;
  }
  escribir(claveProgreso(usuarioId), filas);
}

export async function guardarDelServidor(usuarioId: string, progreso: Progreso[]): Promise<void> {
  const filas = leer<Record<string, Fila>>(claveProgreso(usuarioId), {});
  for (const p of progreso) {
    const local = filas[p.fichaId]?.datos;
    if (local && fusionarProgreso([local], [p])[0] === local) continue;
    filas[p.fichaId] = { datos: p, pendiente: false };
  }
  escribir(claveProgreso(usuarioId), filas);
}

type FilaRacha = { datos: Racha; pendiente: boolean };
const claveRacha = (u: string) => `anatomia.racha.${u}`;
const filaRacha = (u: string) => leer<FilaRacha | null>(claveRacha(u), null);

export async function leerRacha(usuarioId: string): Promise<Racha | null> {
  return filaRacha(usuarioId)?.datos ?? null;
}

export async function guardarRachaPropia(usuarioId: string, racha: Racha): Promise<void> {
  escribir(claveRacha(usuarioId), { datos: racha, pendiente: true });
}

export async function rachaPorSubir(usuarioId: string): Promise<Racha | null> {
  const f = filaRacha(usuarioId);
  return f?.pendiente ? f.datos : null;
}

export async function confirmarRacha(usuarioId: string, subida: Racha): Promise<void> {
  const f = filaRacha(usuarioId);
  if (f && JSON.stringify(f.datos) === JSON.stringify(subida)) escribir(claveRacha(usuarioId), { ...f, pendiente: false });
}

export async function guardarRachaDelServidor(usuarioId: string, servidor: Racha): Promise<void> {
  const f = filaRacha(usuarioId);
  const datos = f ? fusionarRacha(f.datos, servidor) : servidor;
  if (f && JSON.stringify(datos) === JSON.stringify(f.datos)) return;
  escribir(claveRacha(usuarioId), { datos, pendiente: (f?.pendiente ?? false) || JSON.stringify(datos) !== JSON.stringify(servidor) });
}

const claveReportes = (u: string) => `anatomia.reportes.${u}`;

export async function guardarReporte(usuarioId: string, reporte: NuevoReporte): Promise<void> {
  const reportes = leer<NuevoReporte[]>(claveReportes(usuarioId), []);
  if (!reportes.some((r) => r.id === reporte.id)) escribir(claveReportes(usuarioId), [...reportes, reporte]);
}

export async function reportesPorEnviar(usuarioId: string): Promise<NuevoReporte[]> {
  return leer<NuevoReporte[]>(claveReportes(usuarioId), []);
}

export async function borrarReporte(id: string): Promise<void> {
  for (const k of Object.keys(localStorage).filter((k) => k.startsWith("anatomia.reportes."))) {
    escribir(k, leer<NuevoReporte[]>(k, []).filter((r) => r.id !== id));
  }
}
