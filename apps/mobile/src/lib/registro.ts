import { type EventoUso, fusionarMarcas, fusionarProgreso, fusionarRacha, type Intento, type MarcaLeccion, type NuevoReporte, type Racha } from "@anatomia/contenido";
import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import type { Progreso } from "../repaso/espaciado";

/**
 * Intentos, progreso del repaso y racha en SQLite (PRD: "se guardan en expo-sqlite y se envían en lote a
 * /sync"). Todo va por usuario: dos cuentas en el mismo teléfono no se mezclan.
 *  - Intentos: solo los que faltan subir; al subirlos se borran.
 *  - Progreso: el de cada ficha, con `pendiente` si cambió en este teléfono y falta subirlo.
 *  - Racha: una fila, también con `pendiente`.
 *  - Marcas de lección: una fila con la mejor de cada lección, también con `pendiente`.
 *  - Reportes de error y eventos de uso: los que faltan enviar; al enviarlos se borran.
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
      CREATE TABLE IF NOT EXISTS racha (usuario_id TEXT PRIMARY KEY NOT NULL, datos TEXT NOT NULL, pendiente INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS marcas (usuario_id TEXT PRIMARY KEY NOT NULL, datos TEXT NOT NULL, pendiente INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS reportes (id TEXT PRIMARY KEY NOT NULL, usuario_id TEXT NOT NULL, datos TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS eventos (id TEXT PRIMARY KEY NOT NULL, usuario_id TEXT NOT NULL, datos TEXT NOT NULL);
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

export async function leerRacha(usuarioId: string): Promise<Racha | null> {
  const db = await abrir();
  const fila = await db.getFirstAsync<{ datos: string }>("SELECT datos FROM racha WHERE usuario_id = ?", usuarioId);
  return fila ? (JSON.parse(fila.datos) as Racha) : null;
}

/** La racha cambió en este teléfono (terminó una lección o un repaso): queda pendiente de subir. */
export async function guardarRachaPropia(usuarioId: string, racha: Racha): Promise<void> {
  const db = await abrir();
  await db.runAsync("INSERT OR REPLACE INTO racha (usuario_id, datos, pendiente) VALUES (?, ?, 1)", usuarioId, JSON.stringify(racha));
}

export async function rachaPorSubir(usuarioId: string): Promise<Racha | null> {
  const db = await abrir();
  const fila = await db.getFirstAsync<{ datos: string }>("SELECT datos FROM racha WHERE usuario_id = ? AND pendiente = 1", usuarioId);
  return fila ? (JSON.parse(fila.datos) as Racha) : null;
}

/** La racha subida deja de estar pendiente, salvo que haya cambiado mientras se subía. */
export async function confirmarRacha(usuarioId: string, subida: Racha): Promise<void> {
  const db = await abrir();
  await db.runAsync("UPDATE racha SET pendiente = 0 WHERE usuario_id = ? AND datos = ?", usuarioId, JSON.stringify(subida));
}

/**
 * La racha del servidor se une con la local (fusionarRacha). Queda pendiente si la local lo estaba o si la
 * unión trae días que el servidor no tiene: así le llegan en la próxima sincronización.
 */
export async function guardarRachaDelServidor(usuarioId: string, servidor: Racha): Promise<void> {
  const db = await abrir();
  const local = await leerRacha(usuarioId);
  const racha = local ? fusionarRacha(local, servidor) : servidor;
  if (local && JSON.stringify(racha) === JSON.stringify(local)) return;
  await db.runAsync(
    "INSERT INTO racha (usuario_id, datos, pendiente) VALUES (?, ?, ?) ON CONFLICT (usuario_id) DO UPDATE SET datos = excluded.datos, pendiente = MAX(racha.pendiente, excluded.pendiente)",
    usuarioId,
    JSON.stringify(racha),
    JSON.stringify(racha) === JSON.stringify(servidor) ? 0 : 1,
  );
}

export async function guardarReporte(usuarioId: string, reporte: NuevoReporte): Promise<void> {
  const db = await abrir();
  await db.runAsync("INSERT OR IGNORE INTO reportes (id, usuario_id, datos) VALUES (?, ?, ?)", reporte.id, usuarioId, JSON.stringify(reporte));
}

export async function reportesPorEnviar(usuarioId: string): Promise<NuevoReporte[]> {
  const db = await abrir();
  const filas = await db.getAllAsync<{ datos: string }>("SELECT datos FROM reportes WHERE usuario_id = ?", usuarioId);
  return filas.map((f) => JSON.parse(f.datos) as NuevoReporte);
}

export async function borrarReporte(id: string): Promise<void> {
  const db = await abrir();
  await db.runAsync("DELETE FROM reportes WHERE id = ?", id);
}

/** Al borrar la cuenta: todo lo de ese usuario en este teléfono. */
export async function borrarDatosLocales(usuarioId: string): Promise<void> {
  const db = await abrir();
  await db.withTransactionAsync(async () => {
    for (const tabla of ["intentos", "progreso", "racha", "marcas", "reportes", "eventos"]) {
      await db.runAsync(`DELETE FROM ${tabla} WHERE usuario_id = ?`, usuarioId);
    }
  });
}

export async function guardarEvento(usuarioId: string, evento: EventoUso): Promise<void> {
  const db = await abrir();
  await db.runAsync("INSERT OR IGNORE INTO eventos (id, usuario_id, datos) VALUES (?, ?, ?)", evento.id, usuarioId, JSON.stringify(evento));
}

export async function eventosPorEnviar(usuarioId: string, limite: number): Promise<EventoUso[]> {
  const db = await abrir();
  const filas = await db.getAllAsync<{ datos: string }>("SELECT datos FROM eventos WHERE usuario_id = ? LIMIT ?", usuarioId, limite);
  return filas.map((f) => JSON.parse(f.datos) as EventoUso);
}

export async function borrarEventos(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await abrir();
  await db.runAsync(`DELETE FROM eventos WHERE id IN (${ids.map(() => "?").join(", ")})`, ...ids);
}

/** Las marcas en un orden fijo, para guardarlas y compararlas como texto. */
const textoMarcas = (marcas: readonly MarcaLeccion[]) => JSON.stringify([...marcas].sort((a, b) => (a.leccionId < b.leccionId ? -1 : 1)));

export async function leerMarcas(usuarioId: string): Promise<MarcaLeccion[]> {
  const db = await abrir();
  const fila = await db.getFirstAsync<{ datos: string }>("SELECT datos FROM marcas WHERE usuario_id = ?", usuarioId);
  return fila ? (JSON.parse(fila.datos) as MarcaLeccion[]) : [];
}

/** Una lección terminada en este teléfono: si mejora la marca, queda pendiente de subir. Devuelve todas. */
export async function guardarMarcaPropia(usuarioId: string, marca: MarcaLeccion): Promise<MarcaLeccion[]> {
  const local = await leerMarcas(usuarioId);
  const marcas = fusionarMarcas(local, [marca]);
  if (textoMarcas(marcas) === textoMarcas(local)) return local;
  const db = await abrir();
  await db.runAsync("INSERT OR REPLACE INTO marcas (usuario_id, datos, pendiente) VALUES (?, ?, 1)", usuarioId, textoMarcas(marcas));
  return marcas;
}

export async function marcasPorSubir(usuarioId: string): Promise<MarcaLeccion[] | null> {
  const db = await abrir();
  const fila = await db.getFirstAsync<{ datos: string }>("SELECT datos FROM marcas WHERE usuario_id = ? AND pendiente = 1", usuarioId);
  return fila ? (JSON.parse(fila.datos) as MarcaLeccion[]) : null;
}

/** Las marcas subidas dejan de estar pendientes, salvo que hayan cambiado mientras se subían. */
export async function confirmarMarcas(usuarioId: string, subidas: MarcaLeccion[]): Promise<void> {
  const db = await abrir();
  await db.runAsync("UPDATE marcas SET pendiente = 0 WHERE usuario_id = ? AND datos = ?", usuarioId, textoMarcas(subidas));
}

/** Las del servidor se unen con las locales; queda pendiente si este teléfono tiene alguna mejor. */
export async function guardarMarcasDelServidor(usuarioId: string, servidor: MarcaLeccion[]): Promise<void> {
  const local = await leerMarcas(usuarioId);
  const marcas = fusionarMarcas(local, servidor);
  if (textoMarcas(marcas) === textoMarcas(local)) return;
  const db = await abrir();
  await db.runAsync(
    "INSERT INTO marcas (usuario_id, datos, pendiente) VALUES (?, ?, ?) ON CONFLICT (usuario_id) DO UPDATE SET datos = excluded.datos, pendiente = MAX(marcas.pendiente, excluded.pendiente)",
    usuarioId,
    textoMarcas(marcas),
    textoMarcas(marcas) === textoMarcas(servidor) ? 0 : 1,
  );
}
