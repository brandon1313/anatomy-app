import type { Recordatorio } from "../repaso/recordatorio";

/** En web (solo para desarrollo) no hay notificaciones locales programadas: el recordatorio es del teléfono. */
export async function programarRecordatorio(_r: Recordatorio | null): Promise<void> {}

export type EstadoPermiso = "concedido" | "denegado" | "pendiente" | "no_disponible";

export async function estadoPermiso(): Promise<EstadoPermiso> {
  return "no_disponible";
}

export function alAbrirRecordatorio(_f: () => void): () => void {
  return () => {};
}
