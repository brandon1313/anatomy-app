import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { AuthGuard } from "./comun/auth";
import { config } from "./config";
import { ContenidoModule } from "./contenido/contenido.module";
import { GeneradorModule } from "./generador/generador.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PublicacionModule } from "./publicacion/publicacion.module";
import { ReportesModule } from "./reportes/reportes.module";
import { SyncModule } from "./sync/sync.module";
import { UsuariosController } from "./usuarios/usuarios.controller";

@Module({
  imports: [
    JwtModule.register({ global: true, secret: config.JWT_SECRETO }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    ContenidoModule,
    GeneradorModule,
    PublicacionModule,
    ReportesModule,
    SyncModule,
  ],
  controllers: [UsuariosController],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
