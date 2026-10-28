import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Usuario } from "@prisma/client";
import * as argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { config } from "../config";
import { PrismaService } from "../prisma/prisma.service";
import type { Login, Registro } from "./auth.dto";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

@Injectable()
export class AuthService {
  /** Para que un correo inexistente tarde lo mismo que una contraseña incorrecta. */
  private readonly hashFalso = argon2.hash(randomBytes(16).toString("hex"));

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async registrar(datos: Registro) {
    const existe = await this.prisma.usuario.findUnique({ where: { email: datos.email } });
    if (existe) throw new ConflictException("Ya existe una cuenta con ese correo");

    const usuario = await this.prisma.usuario.create({
      data: {
        email: datos.email,
        hash: await argon2.hash(datos.contrasena),
        nombre: datos.nombre,
        universidad: datos.universidad,
        zonaHoraria: datos.zonaHoraria,
        horaRecordatorio: datos.horaRecordatorio,
      },
    });
    await this.prisma.evento.create({ data: { usuarioId: usuario.id, nombre: "registro" } });
    return this.sesion(usuario);
  }

  async login(datos: Login) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email: datos.email } });
    const valido = usuario
      ? await argon2.verify(usuario.hash, datos.contrasena)
      : await argon2.verify(await this.hashFalso, datos.contrasena).then(() => false);
    if (!usuario || !valido) throw new UnauthorizedException("Correo o contraseña incorrectos");
    return this.sesion(usuario);
  }

  /** Rota el token de renovación: el usado se borra y se entrega uno nuevo. */
  async renovar(tokenRenovacion: string) {
    const guardado = await this.prisma.tokenRenovacion.findUnique({
      where: { hash: hashToken(tokenRenovacion) },
      include: { usuario: true },
    });
    if (!guardado || guardado.expira < new Date()) throw new UnauthorizedException();
    // Dos renovaciones a la vez con el mismo token (dos pestañas): solo la que logra borrarlo sigue.
    const { count } = await this.prisma.tokenRenovacion.deleteMany({ where: { id: guardado.id } });
    if (count === 0) throw new UnauthorizedException();
    return this.sesion(guardado.usuario);
  }

  async salir(tokenRenovacion: string) {
    await this.prisma.tokenRenovacion.deleteMany({ where: { hash: hashToken(tokenRenovacion) } });
  }

  private async sesion(usuario: Usuario) {
    const tokenAcceso = await this.jwt.signAsync(
      { sub: usuario.id, rol: usuario.rol, nombre: usuario.nombre, typ: "acceso" },
      { expiresIn: `${config.JWT_ACCESO_MINUTOS}m` },
    );
    const tokenRenovacion = randomBytes(48).toString("base64url");
    await this.prisma.tokenRenovacion.create({
      data: {
        usuarioId: usuario.id,
        hash: hashToken(tokenRenovacion),
        expira: new Date(Date.now() + config.JWT_RENOVACION_DIAS * 24 * 60 * 60 * 1000),
      },
    });
    return {
      // La hora del recordatorio va con la sesión: el teléfono programa la notificación (PRD, "Recordatorio diario").
      usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol, horaRecordatorio: usuario.horaRecordatorio },
      tokenAcceso,
      tokenRenovacion,
    };
  }
}
