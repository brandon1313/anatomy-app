import { z } from "zod";

const Email = z.email().transform((e) => e.trim().toLowerCase());
const HoraRecordatorio = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa HH:MM");

export const Registro = z.object({
  email: Email,
  contrasena: z.string().min(8, "Mínimo 8 caracteres").max(200),
  nombre: z.string().trim().min(1).max(100),
  universidad: z.string().trim().max(150).optional(),
  zonaHoraria: z
    .string()
    .refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz) || tz === "UTC", "Zona horaria inválida")
    .optional(),
  horaRecordatorio: HoraRecordatorio.optional(),
});
export type Registro = z.infer<typeof Registro>;

/** PATCH /me: lo que el estudiante cambia en su perfil. null apaga el recordatorio. */
export const CambiosPerfil = z.object({ horaRecordatorio: HoraRecordatorio.nullable() });
export type CambiosPerfil = z.infer<typeof CambiosPerfil>;

export const Login = z.object({ email: Email, contrasena: z.string().min(1).max(200) });
export type Login = z.infer<typeof Login>;

export const TokenRenovacion = z.object({ tokenRenovacion: z.string().min(1) });
