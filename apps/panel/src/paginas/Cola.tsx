import type { EstadoRevision } from "@anatomia/contenido";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { api, type RespuestaCola } from "../api";
import { Errores, NOMBRES_ESTADO, NOMBRES_TIPO } from "../componentes/comun";

const ESTADOS: EstadoRevision[] = ["borrador", "en_revision", "rechazada", "aprobada"];

export function Cola() {
  const [params, setParams] = useSearchParams();
  const estado = (params.get("estado") as EstadoRevision | null) ?? "borrador";
  const tipo = params.get("tipo") ?? "";
  const consulta = new URLSearchParams({ estado, ...(tipo && { tipo }) });
  const { data, error, isLoading } = useQuery({
    queryKey: ["cola", { estado, tipo }],
    queryFn: () => api<RespuestaCola>(`/admin/cola?${consulta}`),
  });

  const cambiar = (clave: string, valor: string) => {
    const p = new URLSearchParams(params);
    if (valor) p.set(clave, valor);
    else p.delete(clave);
    setParams(p);
  };

  return (
    <section>
      <h1>Cola de revisión</h1>
      <div className="pestanas" role="tablist">
        {ESTADOS.map((e) => (
          <button key={e} role="tab" aria-selected={e === estado} className={e === estado ? "activa" : ""} onClick={() => cambiar("estado", e)}>
            {NOMBRES_ESTADO[e]} {data && <span className="conteo">{data.conteos[e]}</span>}
          </button>
        ))}
        <select value={tipo} onChange={(e) => cambiar("tipo", e.target.value)} aria-label="Filtrar por tipo">
          <option value="">Todos los tipos</option>
          {Object.entries(NOMBRES_TIPO).map(([valor, nombre]) => (
            <option key={valor} value={valor}>{nombre}</option>
          ))}
        </select>
      </div>
      <Errores error={error} />
      {isLoading && <p>Cargando…</p>}
      {data && data.elementos.length === 0 && <p className="vacio">No hay nada en este estado.</p>}
      {data && data.elementos.length > 0 && (
        <table>
          <thead>
            <tr><th>Tipo</th><th>Contenido</th><th>Id</th><th>Versión</th><th>Actualizado</th></tr>
          </thead>
          <tbody>
            {data.elementos.map((e) => (
              <tr key={`${e.coleccion}-${e.id}`}>
                <td>{NOMBRES_TIPO[e.tipo] ?? e.tipo}</td>
                <td>
                  <Link to={`/${e.coleccion}/${e.id}`}>{e.titulo}</Link>
                  {e.notas && e.estado === "rechazada" && <div className="nota">{e.notas}</div>}
                </td>
                <td><code>{e.id}</code></td>
                <td>{e.version}</td>
                <td>{new Date(e.actualizado).toLocaleString("es")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
