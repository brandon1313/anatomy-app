import { Module } from "@nestjs/common";
import { AdminReportesController, ReportesController } from "./reportes.controller";
import { ReportesService } from "./reportes.service";

@Module({ controllers: [ReportesController, AdminReportesController], providers: [ReportesService] })
export class ReportesModule {}
