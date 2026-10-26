import { Module } from "@nestjs/common";
import { ContenidoModule } from "../contenido/contenido.module";
import { LaminasService } from "./laminas.service";

@Module({ imports: [ContenidoModule], providers: [LaminasService], exports: [LaminasService] })
export class LaminasModule {}
