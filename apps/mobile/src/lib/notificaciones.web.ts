import type { Recordatorio } from "../repaso/recordatorio";

/** En web (solo para desarrollo) no hay notificaciones locales programadas: el recordatorio es del teléfono. */
export async function programarRecordatorio(_r: Recordatorio | null): Promise<void> {}
