import { Module } from "@nestjs/common";
import { ContenidoController } from "./contenido.controller";
import { ContenidoService } from "./contenido.service";

@Module({ controllers: [ContenidoController], providers: [ContenidoService], exports: [ContenidoService] })
export class ContenidoModule {}
