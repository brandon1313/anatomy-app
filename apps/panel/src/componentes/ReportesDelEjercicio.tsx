import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type RespuestaReportes } from "../api";
import { Errores, NOMBRES_MOTIVO } from "./comun";

/** Los reportes abiertos de un ejercicio, en su editor: se corrige y se marca resuelto ahí mismo. */
export function ReportesDelEjercicio({ ejercicioId }: { ejercicioId: string }) {
  const cliente = useQueryClient();
  const { data } = useQuery({
    queryKey: ["reportes", { estado: "abierto", ejercicioId }],
    queryFn: () => api<RespuestaReportes>(`/admin/reportes?estado=abierto&ejercicioId=${encodeURIComponent(ejercicioId)}`),
  });
  const resolver = useMutation({
    mutationFn: (id: string) => api(`/admin/reportes/${id}`, { metodo: "PUT", cuerpo: { estado: "resuelto" } }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ["reportes"] }),
  });
  if (!data || data.reportes.length === 0) return null;

  return (
    <div className="tarjeta reportes">
      <h2>Reportes abiertos ({data.reportes.length})</h2>
      <ul>
        {data.reportes.map((r) => (
          <li key={r.id}>
            <strong>{NOMBRES_MOTIVO[r.motivo]}</strong>
            {r.comentario && <span>“{r.comentario}”</span>}
            <span className="nota-pie">{new Date(r.creado).toLocaleString("es")}</span>
            <button className="secundario" disabled={resolver.isPending} onClick={() => resolver.mutate(r.id)}>
              Marcar resuelto
            </button>
          </li>
        ))}
      </ul>
      <Errores error={resolver.error} />
    </div>
  );
}
