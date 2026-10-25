import { Module } from "@nestjs/common";
import { GeneradorController } from "./generador.controller";
import { GeneradorService } from "./generador.service";

@Module({ controllers: [GeneradorController], providers: [GeneradorService] })
export class GeneradorModule {}
