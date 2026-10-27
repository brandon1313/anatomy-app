import { Module } from "@nestjs/common";
import { ContenidoModule } from "../contenido/contenido.module";
import { ModelosService } from "./modelos.service";

@Module({ imports: [ContenidoModule], providers: [ModelosService], exports: [ModelosService] })
export class ModelosModule {}
