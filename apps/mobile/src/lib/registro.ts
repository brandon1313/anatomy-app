import { fusionarProgreso, type Intento } from "@anatomia/contenido";
import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import type { Progreso } from "../repaso/espaciado";

/**
 * Intentos y progreso del repaso en SQLite (PRD: "se guardan en expo-sqlite y se envían en lote a
 * /sync"). Todo va por usuario: dos cuentas en el mismo teléfono no se mezclan.
 *  - Intentos: solo los que faltan subir; al subirlos se borran.
 *  - Progreso: el de cada ficha, con `pendiente` si cambió en este teléfono y falta subirlo.
 */
let base: Promise<SQLiteDatabase> | null = null;

function abrir(): Promise<SQLiteDatabase> {
  base ??= openDatabaseAsync("anatomia.db").then(async (db) => {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS intentos (id TEXT PRIMARY KEY NOT NULL, usuario_id TEXT NOT NULL, datos TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS progreso (
        usuario_id TEXT NOT NULL, ficha_id TEXT NOT NULL, datos TEXT NOT NULL, pendiente INTEGER NOT NULL,
        PRIMARY KEY (usuario_id, ficha_id)
      );
    `);
    return db;
  });
  return base;
}

export async function guardarIntento(usuarioId: string, intento: Intento): Promise<void> {
  const db = await abrir();
  await db.runAsync("INSERT OR IGNORE INTO intentos (id, usuario_id, datos) VALUES (?, ?, ?)", intento.id, usuarioId, JSON.stringify(intento));
}

export async function intentosPorSubir(usuarioId: string, limite: number): Promise<Intento[]> {
  const db = await abrir();
  const filas = await db.getAllAsync<{ datos: string }>("SELECT datos FROM intentos WHERE usuario_id = ? LIMIT ?", usuarioId, limite);
  return filas.map((f) => JSON.parse(f.datos) as Intento);
}

export async function borrarIntentos(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await abrir();
  await db.runAsync(`DELETE FROM intentos WHERE id IN (${ids.map(() => "?").join(", ")})`, ...ids);
}

export async function leerProgreso(usuarioId: string): Promise<Progreso[]> {
  const db = await abrir();
  const filas = await db.getAllAsync<{ datos: string }>("SELECT datos FROM progreso WHERE usuario_id = ?", usuarioId);
  return filas.map((f) => JSON.parse(f.datos) as Progreso);
}

/** Progreso que cambió en este teléfono (una sesión terminada): queda pendiente de subir. */
export async function guardarProgresoPropio(usuarioId: string, progreso: Progreso[]): Promise<void> {
  const db = await abrir();
  await db.withTransactionAsync(async () => {
    for (const p of progreso) {
      await db.runAsync("INSERT OR REPLACE INTO progreso (usuario_id, ficha_id, datos, pendiente) VALUES (?, ?, ?, 1)", usuarioId, p.fichaId, JSON.stringify(p));
    }
  });
}

export async function progresoPorSubir(usuarioId: string): Promise<Progreso[]> {
  const db = await abrir();
  const filas = await db.getAllAsync<{ datos: string }>("SELECT datos FROM progreso WHERE usuario_id = ? AND pendiente = 1", usuarioId);
  return filas.map((f) => JSON.parse(f.datos) as Progreso);
}

/** Lo subido deja de estar pendiente, salvo que haya cambiado mientras se subía. */
export async function confirmarSubida(usuarioId: string, subido: Progreso[]): Promise<void> {
  const db = await abrir();
  await db.withTransactionAsync(async () => {
    for (const p of subido) {
      await db.runAsync("UPDATE progreso SET pendiente = 0 WHERE usuario_id = ? AND ficha_id = ? AND datos = ?", usuarioId, p.fichaId, JSON.stringify(p));
    }
  });
}

/** El progreso consolidado del servidor: entra el de cada ficha que sea más reciente que el local. */
export async function guardarDelServidor(usuarioId: string, progreso: Progreso[]): Promise<void> {
  const db = await abrir();
  await db.withTransactionAsync(async () => {
    for (const p of progreso) {
      const fila = await db.getFirstAsync<{ datos: string }>("SELECT datos FROM progreso WHERE usuario_id = ? AND ficha_id = ?", usuarioId, p.fichaId);
      const local = fila ? (JSON.parse(fila.datos) as Progreso) : undefined;
      if (local && fusionarProgreso([local], [p])[0] === local) continue;
      await db.runAsync("INSERT OR REPLACE INTO progreso (usuario_id, ficha_id, datos, pendiente) VALUES (?, ?, ?, 0)", usuarioId, p.fichaId, JSON.stringify(p));
    }
  });
}
