import { SalidaGenerador } from "@anatomia/contenido";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import ejemplo from "./ejemplo-generador.json";

/** Devuelve el texto JSON que produjo el modelo; validarlo es trabajo del generador. */
export interface ProveedorLLM {
  nombre: string;
  generar(sistema: string, mensaje: string): Promise<string>;
}

export class ErrorProveedor extends Error {}

/** Claude con salida estructurada: el formato es z.toJSONSchema(SalidaGenerador). */
export class ProveedorAnthropic implements ProveedorLLM {
  nombre = "anthropic";
  private readonly cliente = new Anthropic();
  // Solo se usa el esquema; la validación la hace el generador para poder reintentar con los errores.
  private readonly esquema = betaZodOutputFormat(SalidaGenerador).schema;

  constructor(private readonly modelo: string) {}

  async generar(sistema: string, mensaje: string): Promise<string> {
    const r = await this.cliente.beta.messages.create({
      model: this.modelo,
      max_tokens: 16000,
      system: sistema,
      messages: [{ role: "user", content: mensaje }],
      output_config: { effort: "high", format: { type: "json_schema", schema: this.esquema } },
      // Si el modelo declina por política, la API reintenta en otro modelo dentro de la misma llamada.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (r.stop_reason === "refusal") {
      throw new ErrorProveedor(`El modelo se negó a responder: ${r.stop_details?.explanation ?? "sin detalle"}`);
    }
    if (r.stop_reason === "max_tokens") throw new ErrorProveedor("La respuesta se cortó por max_tokens");
    return r.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  }
}

/** Sin LLM: devuelve la salida de ejemplo del contrato. Solo para desarrollo y pruebas. */
export class ProveedorEjemplo implements ProveedorLLM {
  nombre = "ejemplo";

  async generar(): Promise<string> {
    return JSON.stringify(ejemplo);
  }
}
