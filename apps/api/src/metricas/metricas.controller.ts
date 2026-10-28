import { Controller, Get } from "@nestjs/common";
import { Roles } from "../comun/auth";
import { MetricasService } from "./metricas.service";

/** Las métricas de la beta, para decidir si seguir. Solo admin (PRD, roles). */
@Roles("admin")
@Controller("admin/metricas")
export class MetricasController {
  constructor(private readonly metricas: MetricasService) {}

  @Get()
  calcular() {
    return this.metricas.calcular();
  }
}
