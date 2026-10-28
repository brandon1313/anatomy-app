import { NuevoReporte } from "@anatomia/contenido";
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { z } from "zod";
import { Roles, UsuarioActual, type UsuarioToken } from "../comun/auth";
import { ZodPipe } from "../comun/zod.pipe";
import { ReportesService } from "./reportes.service";

const EstadoReporte = z.enum(["abierto", "resuelto"]);
const FiltroReportes = z.object({ estado: EstadoReporte.optional(), ejercicioId: z.string().optional() });
const CambioEstado = z.object({ estado: EstadoReporte });

/** Desde cada ejercicio de la app, el estudiante reporta un error (PRD, "Reportar error"). */
@Controller("reportes")
export class ReportesController {
  constructor(private readonly reportes: ReportesService) {}

  @HttpCode(204)
  @Post()
  crear(@UsuarioActual() usuario: UsuarioToken, @Body(new ZodPipe(NuevoReporte)) reporte: NuevoReporte) {
    return this.reportes.crear(usuario.id, reporte);
  }
}

/** La revisora ve los reportes junto a su ejercicio y los marca como resueltos (o los reabre). */
@Roles("editor")
@Controller("admin/reportes")
export class AdminReportesController {
  constructor(private readonly reportes: ReportesService) {}

  @Get()
  async listar(@Query(new ZodPipe(FiltroReportes)) filtro: z.infer<typeof FiltroReportes>) {
    const [reportes, conteos] = await Promise.all([this.reportes.listar(filtro), this.reportes.conteos()]);
    return { reportes, conteos };
  }

  @HttpCode(204)
  @Put(":id")
  cambiarEstado(@Param("id", ParseUUIDPipe) id: string, @Body(new ZodPipe(CambioEstado)) { estado }: z.infer<typeof CambioEstado>) {
    return this.reportes.cambiarEstado(id, estado);
  }
}
