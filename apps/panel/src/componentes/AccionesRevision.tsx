import type { EstadoRevision, Revision } from "@anatomia/contenido";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Coleccion } from "../api";
import { Errores, Estado } from "./comun";

/** Estado, versión, nota de revisión y los botones Guardar / Enviar / Aprobar / Rechazar. */
export function AccionesRevision(props: {
  coleccion: Coleccion;
  id: string;
  estado: EstadoRevision;
  version: number;
  revision: Revision;
  sinGuardar: boolean;
  /** El borrador no pasa la validación del esquema. */
  invalido: boolean;
  guardando: boolean;
  onGuardar: () => void;
}) {
  const { coleccion, id, estado, version, revision, sinGuardar } = props;
  const cliente = useQueryClient();
  const accion = useMutation({
    mutationFn: ({ ruta, cuerpo }: { ruta: string; cuerpo?: unknown }) =>
      api(`/admin/${coleccion}/${id}/${ruta}`, { metodo: "POST", cuerpo }),
    onSuccess: () => cliente.invalidateQueries(),
  });

  function rechazar() {
    const nota = window.prompt("¿Qué hay que corregir? (obligatorio)");
    if (nota?.trim()) accion.mutate({ ruta: "rechazar", cuerpo: { nota } });
  }

  return (
    <div className="acciones">
      <div className="meta">
        <Estado estado={estado} /> <span>versión {version}</span>
        {revision.revisadoPor && (
          <span>
            · {revision.estado === "aprobada" ? "aprobó" : "revisó"} {revision.revisadoPor}
            {revision.fecha && ` el ${new Date(revision.fecha).toLocaleString("es")}`}
          </span>
        )}
      </div>
      {revision.notas && <p className="nota">Nota de la revisión: {revision.notas}</p>}
      {estado === "aprobada" && <p className="aviso">Si guardas cambios, vuelve a revisión y sube a la versión {version + 1}.</p>}
      <div className="botones">
        <button onClick={props.onGuardar} disabled={!sinGuardar || props.invalido || props.guardando}>
          {props.guardando ? "Guardando…" : "Guardar"}
        </button>
        {estado === "borrador" && (
          <button className="secundario" disabled={sinGuardar || accion.isPending} onClick={() => accion.mutate({ ruta: "enviar" })}>
            Enviar a revisión
          </button>
        )}
        {estado !== "aprobada" && (
          <button className="aprobar" disabled={sinGuardar || accion.isPending} onClick={() => accion.mutate({ ruta: "aprobar" })}
            title={sinGuardar ? "Guarda los cambios antes de aprobar" : undefined}>
            Aprobar
          </button>
        )}
        {estado !== "rechazada" && (
          <button className="rechazar" disabled={sinGuardar || accion.isPending} onClick={rechazar}>
            Rechazar
          </button>
        )}
      </div>
      <Errores error={accion.error} />
    </div>
  );
}
