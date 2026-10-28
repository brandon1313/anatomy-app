import type { PlanPremium } from "@anatomia/contenido";
import { elegirOferta, type Oferta, type RegistroOfertas } from "../leccion/oferta";
import { borrarJson, guardarJson, leerJson } from "./almacen";

/** Premium en el teléfono, por usuario: qué ofertas ya aparecieron solas y qué plan le interesó. */
const claveOfertas = (usuarioId: string) => `premium-ofertas-${usuarioId}`;
/** Antes de las ofertas por momento, solo se guardaba si ya apareció la de la tercera lección. */
const claveMostrada = (usuarioId: string) => `premium-mostrada-${usuarioId}`;
const claveInteres = (usuarioId: string) => `premium-interes-${usuarioId}`;

/**
 * De las ofertas que abrió terminar una lección, la que toca mostrar ahora, y queda anotada: cada una una
 * vez, a lo sumo una por día, y ninguna si ya tocó "Me interesa" (docs/PLAN-PREMIUM.md).
 */
export async function ofertaParaMostrar(usuarioId: string, ofertas: readonly Oferta[], hoy: string): Promise<Oferta | null> {
  if (ofertas.length === 0 || (await leerInteresPremium(usuarioId))) return null;
  const registro: RegistroOfertas = (await leerJson<RegistroOfertas>(claveOfertas(usuarioId))) ?? {
    vistas: (await leerJson<boolean>(claveMostrada(usuarioId))) ? ["tercera_leccion"] : [],
  };
  const oferta = elegirOferta(ofertas, registro, hoy);
  if (oferta) await guardarJson(claveOfertas(usuarioId), { dia: hoy, vistas: [...registro.vistas, oferta.clave] });
  return oferta;
}

export const leerInteresPremium = (usuarioId: string) => leerJson<PlanPremium>(claveInteres(usuarioId));
export const guardarInteresPremium = (usuarioId: string, plan: PlanPremium) => guardarJson(claveInteres(usuarioId), plan);

export async function borrarDatosPremium(usuarioId: string): Promise<void> {
  await Promise.all([borrarJson(claveOfertas(usuarioId)), borrarJson(claveMostrada(usuarioId)), borrarJson(claveInteres(usuarioId))]);
}
