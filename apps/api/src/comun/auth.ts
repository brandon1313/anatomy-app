import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Rol } from "@prisma/client";
import type { Request } from "express";

export interface UsuarioToken {
  id: string;
  rol: Rol;
  nombre: string;
}

const CLAVE_PUBLICO = "publico";
const CLAVE_ROLES = "roles";

/** La ruta no requiere token. */
export const Publico = () => SetMetadata(CLAVE_PUBLICO, true);

/** Roles con acceso; admin siempre entra. Sin decorador basta con estar autenticado. */
export const Roles = (...roles: Rol[]) => SetMetadata(CLAVE_ROLES, roles);

export const UsuarioActual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UsuarioToken => ctx.switchToHttp().getRequest().usuario,
);

/** Guard global: valida el token de acceso y el rol. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const objetivos = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(CLAVE_PUBLICO, objetivos)) return true;

    const req = ctx.switchToHttp().getRequest<Request & { usuario?: UsuarioToken }>();
    const [tipo, token] = req.headers.authorization?.split(" ") ?? [];
    if (tipo !== "Bearer" || !token) throw new UnauthorizedException();

    let carga: { sub: string; rol: Rol; nombre: string; typ?: string };
    try {
      carga = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException();
    }
    if (carga.typ !== "acceso") throw new UnauthorizedException();
    req.usuario = { id: carga.sub, rol: carga.rol, nombre: carga.nombre };

    const roles = this.reflector.getAllAndOverride<Rol[] | undefined>(CLAVE_ROLES, objetivos);
    if (roles && carga.rol !== "admin" && !roles.includes(carga.rol)) throw new ForbiddenException();
    return true;
  }
}
