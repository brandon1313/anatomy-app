import { fusionarProgreso, type Intento } from "@anatomia/contenido";
import type { Progreso } from "../repaso/espaciado";

/**
 * En web (solo para desarrollo) el registro va en localStorage, con las mismas reglas que la versión de
 * SQLite (registro.ts): intentos por subir, y progreso por ficha con `pendiente`.
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
