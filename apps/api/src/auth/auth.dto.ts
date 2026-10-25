import { z } from "zod";

const Email = z.email().transform((e) => e.trim().toLowerCase());

export const Registro = z.object({
  email: Email,
  contrasena: z.string().min(8, "Mínimo 8 caracteres").max(200),
  nombre: z.string().trim().min(1).max(100),
  universidad: z.string().trim().max(150).optional(),
  zonaHoraria: z
    .string()
    .refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz) || tz === "UTC", "Zona horaria inválida")
    .optional(),
  horaRecordatorio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa HH:MM").optional(),
});
export type Registro = z.infer<typeof Registro>;

export const Login = z.object({ email: Email, contrasena: z.string().min(1).max(200) });
export type Login = z.infer<typeof Login>;

export const TokenRenovacion = z.object({ tokenRenovacion: z.string().min(1) });
