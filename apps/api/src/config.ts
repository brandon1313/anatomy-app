import "dotenv/config";
import { z } from "zod";

const Entorno = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().default(3000),
  JWT_SECRETO: z.string().min(32, "JWT_SECRETO debe tener al menos 32 caracteres"),
  JWT_ACCESO_MINUTOS: z.coerce.number().int().positive().default(15),
  JWT_RENOVACION_DIAS: z.coerce.number().int().positive().default(30),
  CORS_ORIGENES: z.string().default(""),
  LLM_PROVEEDOR: z.enum(["anthropic", "ejemplo"]).default("anthropic"),
  LLM_MODELO: z.string().default("claude-opus-5-5"),
});

export const config = Entorno.parse(process.env);
