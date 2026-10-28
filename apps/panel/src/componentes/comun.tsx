import type { EstadoRevision, MotivoReporte } from "@anatomia/contenido";
import { ErrorApi } from "../api";

/** Los mismos textos que ve el estudiante al reportar. */
export const NOMBRES_MOTIVO: Record<MotivoReporte, string> = {
  respuesta_incorrecta: "La respuesta correcta está mal",
  texto_confuso: "El texto no se entiende",
  imagen: "Problema con la imagen o el 3D",
  otro: "Otra cosa",
};

export const NOMBRES_ESTADO: Record<EstadoRevision, string> = {
  borrador: "Borrador",
  en_revision: "En revisión",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

export const NOMBRES_TIPO: Record<string, string> = {
  ficha: "Ficha",
  imagen: "Imagen",
  opcion_multiple: "Opción múltiple",
  emparejar: "Emparejar",
  caso_clinico: "Caso clínico",
  identificar_imagen: "Identificar en imagen",
  tocar_estructura: "Tocar estructura",
};

export function Estado({ estado }: { estado: EstadoRevision }) {
  return <span className={`estado estado-${estado}`}>{NOMBRES_ESTADO[estado]}</span>;
}

export function Errores({ error }: { error: unknown }) {
  if (!error) return null;
  const e = error as Error;
  return (
    <div className="error" role="alert">
      <p>{e.message}</p>
      {e instanceof ErrorApi && e.errores.length > 0 && (
        <ul>
          {e.errores.map((x, i) => (
            <li key={i}>
              {x.ruta && <code>{x.ruta}</code>} {x.mensaje}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Lista editable de textos (origen, inserción, acciones, sinónimos…). */
export function ListaTextos({ valores, onChange, etiqueta }: { valores: string[]; onChange: (v: string[]) => void; etiqueta: string }) {
  return (
    <fieldset>
      <legend>{etiqueta}</legend>
      {valores.map((v, i) => (
        <div className="fila" key={i}>
          <input value={v} aria-label={`${etiqueta} ${i + 1}`} onChange={(e) => onChange(valores.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" className="secundario" aria-label="Quitar" onClick={() => onChange(valores.filter((_, j) => j !== i))}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="secundario" onClick={() => onChange([...valores, ""])}>
        + Agregar
      </button>
    </fieldset>
  );
}
