import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { api, type EstadoReporte, type RespuestaReportes } from "../api";
import { Errores, Estado, NOMBRES_MOTIVO, NOMBRES_TIPO } from "../componentes/comun";

const ESTADOS: [EstadoReporte, string][] = [
  ["abierto", "Abiertos"],
  ["resuelto", "Resueltos"],
];

/** Reportes de los estudiantes junto a su ejercicio: se abre el ejercicio para corregirlo y se marca resuelto. */
export function Reportes() {
  const [params, setParams] = useSearchParams();
  const estado = (params.get("estado") as EstadoReporte | null) ?? "abierto";
  const cliente = useQueryClient();
  const { data, error, isLoading } = useQuery({
    queryKey: ["reportes", { estado }],
    queryFn: () => api<RespuestaReportes>(`/admin/reportes?estado=${estado}`),
  });
  const cambiar = useMutation({
    mutationFn: (r: { id: string; estado: EstadoReporte }) => api(`/admin/reportes/${r.id}`, { metodo: "PUT", cuerpo: { estado: r.estado } }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ["reportes"] }),
  });

  return (
    <section>
      <h1>Reportes de error</h1>
      <div className="pestanas" role="tablist">
        {ESTADOS.map(([e, nombre]) => (
          <button key={e} role="tab" aria-selected={e === estado} className={e === estado ? "activa" : ""} onClick={() => setParams({ estado: e })}>
            {nombre} {data && <span className="conteo">{data.conteos[e]}</span>}
          </button>
        ))}
      </div>
      <Errores error={error ?? cambiar.error} />
      {isLoading && <p>Cargando…</p>}
      {data && data.reportes.length === 0 && (
        <p className="vacio">{estado === "abierto" ? "No hay reportes abiertos." : "Todavía no se resolvió ningún reporte."}</p>
      )}
      {data && data.reportes.length > 0 && (
        <table>
          <thead>
            <tr><th>Ejercicio</th><th>Motivo</th><th>Comentario</th><th>Fecha</th><th /></tr>
          </thead>
          <tbody>
            {data.reportes.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.ejercicio ? <Link to={`/ejercicios/${r.ejercicioId}`}>{r.ejercicio.titulo}</Link> : <span className="vacio">El ejercicio ya no existe</span>}
                  <div className="nota-pie">
                    {r.ejercicio && <>{NOMBRES_TIPO[r.ejercicio.tipo] ?? r.ejercicio.tipo} <Estado estado={r.ejercicio.estado} /> · </>}
                    <code>{r.ejercicioId}</code>
                  </div>
                </td>
                <td>{NOMBRES_MOTIVO[r.motivo]}</td>
                <td>{r.comentario ?? <span className="vacio">Sin comentario</span>}</td>
                <td>{new Date(r.creado).toLocaleString("es")}</td>
                <td>
                  <button className="secundario" disabled={cambiar.isPending} onClick={() => cambiar.mutate({ id: r.id, estado: r.estado === "abierto" ? "resuelto" : "abierto" })}>
                    {r.estado === "abierto" ? "Marcar resuelto" : "Reabrir"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
