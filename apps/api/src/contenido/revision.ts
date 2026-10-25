import type { EstadoRevision, Revision } from "@anatomia/contenido";

/**
 * Reglas de estado al editar (PRD, "Modelo de datos"): un cambio a algo aprobado lo regresa a
 * en_revision y sube su versión; un rechazado corregido vuelve a en_revision.
 */
export function trasEditar(estado: EstadoRevision, version: number, revision: Revision) {
  switch (estado) {
    case "aprobada":
      return { estado: "en_revision" as const, version: version + 1, revision: { estado: "en_revision" as const } };
    case "rechazada":
      // Se conserva la nota del rechazo para que la revisora vea qué se pidió corregir.
      return { estado: "en_revision" as const, version, revision: { estado: "en_revision" as const, notas: revision.notas } };
    default:
      return { estado, version, revision };
  }
}

export function revisionAprobada(revisor: string, ahora = new Date()): Revision {
  return { estado: "aprobada", revisadoPor: revisor, fecha: ahora.toISOString() };
}

export function revisionRechazada(revisor: string, nota: string, ahora = new Date()): Revision {
  return { estado: "rechazada", revisadoPor: revisor, fecha: ahora.toISOString(), notas: nota };
}
