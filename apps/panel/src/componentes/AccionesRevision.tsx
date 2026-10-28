import type { EstadoRevision, Revision } from "@anatomia/contenido";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api, type Coleccion } from "../api";
import { Errores, Estado } from "./comun";
import { usePosicionEnCola } from "./NavegacionCola";

/**
 * Estado, versión, nota de revisión, los botones Guardar / Enviar / Aprobar / Rechazar y el paso
 * por la cola: al aprobar o rechazar se abre el siguiente.
 */
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
  const navegar = useNavigate();
  const posicion = usePosicionEnCola(coleccion, id, estado);
  const accion = useMutation({
    mutationFn: ({ ruta, cuerpo }: { ruta: string; cuerpo?: unknown }) =>
      api(`/admin/${coleccion}/${id}/${ruta}`, { metodo: "POST", cuerpo }),
    onSuccess: (_, { ruta }) => {
      cliente.invalidateQueries();
      if ((ruta === "aprobar" || ruta === "rechazar") && posicion.siguiente) navegar(posicion.siguiente);
    },
  });
  const salir = (e: React.MouseEvent) => {
    if (sinGuardar && !window.confirm("Hay cambios sin guardar. ¿Salir igual?")) e.preventDefault();
  };

  function rechazar() {
    const nota = window.prompt("¿Qué hay que corregir? (obligatorio)");
    if (nota?.trim()) accion.mutate({ ruta: "rechazar", cuerpo: { nota } });
  }

  return (
    <div className="acciones">
      <nav className="paso-cola" aria-label="Cola de revisión">
        <Link to={posicion.cola} onClick={salir}>← Cola</Link>
        {posicion.texto && <span className="tenue">{posicion.texto}</span>}
        <span className="separador" />
        {posicion.anterior ? <Link to={posicion.anterior} onClick={salir}>‹ Anterior</Link> : <span className="tenue">‹ Anterior</span>}
        {posicion.siguiente ? <Link to={posicion.siguiente} onClick={salir}>Siguiente ›</Link> : <span className="tenue">Siguiente ›</span>}
      </nav>
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
