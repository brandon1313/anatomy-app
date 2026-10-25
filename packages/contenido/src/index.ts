import { z } from "zod";

// Mensajes de validación en español para toda la app (panel, API y mensajes al generador).
z.config(z.locales.es());

export * from "./esquema-contenido";
export * from "./utilidades";
