import type { PlanPremium } from "@anatomia/contenido";
import { borrarJson, guardarJson, leerJson } from "./almacen";

/** Premium en el teléfono, por usuario: si ya apareció sola y qué plan le interesó. */
const claveMostrada = (usuarioId: string) => `premium-mostrada-${usuarioId}`;
const claveInteres = (usuarioId: string) => `premium-interes-${usuarioId}`;

/** Premium aparece sola una vez, al completar la tercera lección (PRD). Devuelve si toca mostrarla ahora. */
export async function mostrarPremiumUnaVez(usuarioId: string, completadas: number): Promise<boolean> {
  if (completadas < 3 || (await leerJson<boolean>(claveMostrada(usuarioId)))) return false;
  await guardarJson(claveMostrada(usuarioId), true);
  return true;
}

export const leerInteresPremium = (usuarioId: string) => leerJson<PlanPremium>(claveInteres(usuarioId));
export const guardarInteresPremium = (usuarioId: string, plan: PlanPremium) => guardarJson(claveInteres(usuarioId), plan);

export async function borrarDatosPremium(usuarioId: string): Promise<void> {
  await Promise.all([borrarJson(claveMostrada(usuarioId)), borrarJson(claveInteres(usuarioId))]);
}
