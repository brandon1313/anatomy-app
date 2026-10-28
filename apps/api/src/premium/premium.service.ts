import { OFERTA_PREMIUM, OfertaPremium, type PlanPremium, varianteOferta } from "@anatomia/contenido";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PremiumService {
  constructor(private readonly prisma: PrismaService) {}

  /** La oferta guardada en configuracion ("premium"); si falta o no es válida, la del PRD. */
  async oferta(): Promise<OfertaPremium> {
    const fila = await this.prisma.configuracion.findUnique({ where: { clave: "premium" } });
    const r = OfertaPremium.safeParse(fila?.valor);
    return r.success ? r.data : OFERTA_PREMIUM;
  }

  /**
   * "Me interesa": una fila por toque (la métrica cuenta usuarios distintos) y su evento, con dónde apareció
   * la oferta y la variante de la prueba A/B que vio el estudiante. No cobra nada.
   */
  async registrarInteres(usuarioId: string, plan: PlanPremium, origen?: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.interesPremium.create({ data: { usuarioId, plan } }),
      this.prisma.evento.create({ data: { usuarioId, nombre: "premium_interes", propiedades: { plan, ...(origen && { origen }), variante: varianteOferta(usuarioId) } } }),
    ]);
  }
}
