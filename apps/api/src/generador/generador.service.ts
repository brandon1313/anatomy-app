import { Ejercicio, FichaMusculo, type SalidaGenerador } from "@anatomia/contenido";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { config } from "../config";
import { PrismaService } from "../prisma/prisma.service";
import { mensajeCorreccion, mensajeUsuario, SISTEMA, slug, UNIDADES } from "./prompt";
import { type ProveedorLLM, ProveedorAnthropic, ProveedorEjemplo } from "./proveedores";
import { validarSalida } from "./validar";

/** Reintentos después del primer intento, pasando los errores al modelo (PRD: hasta 2). */
const REINTENTOS = 2;
const EN_PARALELO = 3;

export type ResultadoMusculo =
  | { musculo: string; estado: "creado"; fichaId: string; ejercicioIds: string[]; intentos: number }
  | { musculo: string; estado: "omitido"; fichaId: string; motivo: string }
  | { musculo: string; estado: "fallido"; fichaId: string; errores: string[]; intentos: number };

const json = (v: unknown) => v as Prisma.InputJsonValue;

@Injectable()
export class GeneradorService {
  private readonly logger = new Logger(GeneradorService.name);
  private readonly proveedor: ProveedorLLM =
    config.LLM_PROVEEDOR === "ejemplo" ? new ProveedorEjemplo() : new ProveedorAnthropic(config.LLM_MODELO);

  constructor(private readonly prisma: PrismaService) {}

  async generar(idUnidad: string, musculos: string[]): Promise<ResultadoMusculo[]> {
    const unidad = UNIDADES[idUnidad];
    if (!unidad) throw new BadRequestException(`Unidad desconocida: ${idUnidad}`);

    const resultados: ResultadoMusculo[] = [];
    const pendientes = [...new Set(musculos.map((m) => m.trim()).filter(Boolean))];
    const trabajador = async () => {
      for (let m = pendientes.shift(); m !== undefined; m = pendientes.shift()) {
        resultados.push(await this.generarMusculo(m, unidad));
      }
    };
    await Promise.all(Array.from({ length: EN_PARALELO }, trabajador));
    return resultados.sort((a, b) => musculos.indexOf(a.musculo) - musculos.indexOf(b.musculo));
  }

  private async generarMusculo(musculo: string, unidad: { titulo: string; region: string }): Promise<ResultadoMusculo> {
    const fichaId = slug(musculo);
    // Nunca se pisa una ficha existente: puede tener trabajo de la revisora.
    if (await this.prisma.ficha.findUnique({ where: { id: fichaId } })) {
      return { musculo, estado: "omitido", fichaId, motivo: "Ya existe una ficha con ese id" };
    }

    const original = mensajeUsuario(musculo, unidad);
    let mensaje = original;
    let errores: string[] = [];
    for (let intento = 1; intento <= REINTENTOS + 1; intento++) {
      let texto: string;
      try {
        texto = await this.proveedor.generar(SISTEMA, mensaje);
      } catch (e) {
        this.logger.error(`${musculo}: falló la llamada al LLM`, e as Error);
        return { musculo, estado: "fallido", fichaId, errores: [(e as Error).message], intentos: intento };
      }

      const [fichas, ejercicios] = await Promise.all([
        this.prisma.ficha.findMany({ select: { id: true } }),
        this.prisma.ejercicio.findMany({ select: { id: true } }),
      ]);
      const r = validarSalida(texto, fichaId, {
        fichas: fichas.map((f) => f.id),
        ejercicios: ejercicios.map((e) => e.id),
      });
      if (r.ok) {
        const ejercicioIds = await this.guardar(r.salida);
        this.logger.log(`${musculo}: ${ejercicioIds.length} ejercicios en borrador (intento ${intento})`);
        return { musculo, estado: "creado", fichaId, ejercicioIds, intentos: intento };
      }
      errores = r.errores;
      this.logger.warn(`${musculo}: intento ${intento} no validó: ${errores.join("; ")}`);
      mensaje = mensajeCorreccion(original, texto, errores);
    }
    return { musculo, estado: "fallido", fichaId, errores, intentos: REINTENTOS + 1 };
  }

  /** Todo entra como borrador, versión 1. */
  private async guardar(salida: SalidaGenerador): Promise<string[]> {
    const revision = { estado: "borrador" as const };
    const fichas = salida.fichas.map((f) => FichaMusculo.parse({ ...f, revision, version: 1 }));
    const ejercicios = salida.ejercicios.map((e) => Ejercicio.parse({ ...e, revision, version: 1 }));
    await this.prisma.$transaction([
      ...fichas.map((f) => this.prisma.ficha.create({ data: { id: f.id, data: json(f) } })),
      ...ejercicios.map((e) =>
        this.prisma.ejercicio.create({ data: { id: e.id, tipo: e.tipo, data: json(e), fichaIds: e.fichaIds } }),
      ),
    ]);
    return ejercicios.map((e) => e.id);
  }
}
