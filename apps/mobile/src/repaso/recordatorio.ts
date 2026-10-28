import type { Racha } from "@anatomia/contenido";
import { diaDeEstudio } from "./dia";
import { rachaVigente } from "./racha";

/**
 * Recordatorio diario (PRD, "Recordatorio diario"): suena a la hora que eligió el estudiante, solo en días
 * de estudio sin actividad, y hay uno programado a la vez. Esto decide cuándo y qué dice; programarlo es
 * de lib/notificaciones.
 */
export interface Recordatorio {
  cuando: Date;
  titulo: string;
  cuerpo: string;
}

/**
 * La próxima vez que el reloj marque `hora` ("HH:MM") en un día sin actividad: hoy si todavía no se estudió
 * y no pasó la hora; si no, mañana. Una hora antes de las 4 a. m. es del día de estudio anterior.
 */
export function proximoRecordatorio(hora: string, racha: Racha, ahora: Date): Recordatorio | null {
  const [h, m] = hora.split(":").map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  for (let dias = 0; dias < 3; dias++) {
    const cuando = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + dias, h, m);
    const dia = diaDeEstudio(cuando);
    if (cuando <= ahora || (racha.ultimoDia !== undefined && dia <= racha.ultimoDia)) continue;
    const enRacha = rachaVigente(racha, dia);
    return enRacha > 0
      ? { cuando, titulo: "No pierdas tu racha", cuerpo: `Tu racha de ${enRacha} ${enRacha === 1 ? "día" : "días"} te espera. Una lección toma 3 minutos.` }
      : { cuando, titulo: "Hora de estudiar", cuerpo: "Una lección toma 3 minutos. ¿Repasamos un músculo?" };
  }
  // Solo si el reloj retrocedió y la última actividad quedó en "el futuro": no hay día sin actividad cerca.
  return null;
}
