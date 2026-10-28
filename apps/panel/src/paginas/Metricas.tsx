import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, type Metricas as TMetricas, type Retencion } from "../api";
import { Errores, NOMBRES_TIPO } from "../componentes/comun";

/** Dónde apareció la oferta de Premium (docs/PLAN-PREMIUM.md). */
const MOMENTOS: Record<string, string> = {
  tercera_leccion: "Al completar la tercera lección",
  fin_unidad: "Al terminar una unidad",
  fin_region: "Al terminar el curso",
  perfil: "Desde Perfil",
  otro: "Otro",
  sin_dato: "Sin dato (interés de antes de medirlo)",
};

const porcentaje = (parte: number, total: number) => (total ? `${Math.round((parte / total) * 100)}%` : "—");
const decimal = (n: number | null) => (n === null ? "—" : n.toLocaleString("es", { maximumFractionDigits: 1 }));
const retencion = (r: Retencion) => ({ valor: porcentaje(r.retenidos, r.elegibles), detalle: `${r.retenidos} de ${r.elegibles} que ya cumplieron el día` });

function Dato(props: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="dato">
      <div className="dato-titulo">{props.titulo}</div>
      <div className="dato-valor">{props.valor}</div>
      {props.detalle && <div className="nota-pie">{props.detalle}</div>}
    </div>
  );
}

/** Las métricas de la beta (PRD, "Medición de la beta"). Solo cuentan los estudiantes. */
export function Metricas() {
  const { data: m, error, isLoading } = useQuery({ queryKey: ["metricas"], queryFn: () => api<TMetricas>("/admin/metricas") });
  if (isLoading) return <p>Cargando…</p>;
  if (!m) return <Errores error={error} />;

  const { estudiantes: e } = m;
  const porUsuario = (x: { total: number; usuarios: number }) =>
    x.usuarios ? `${x.usuarios} estudiante(s), ${decimal(x.total / x.usuarios)} por estudiante` : "Nadie todavía";
  const revisar = m.ejercicios.filter((x) => x.revisar).length;

  return (
    <section>
      <h1>Métricas de la beta</h1>
      <p className="nota-pie">Los días son días de estudio en la zona horaria de cada estudiante. El equipo (editores y admin) no cuenta.</p>
      <div className="datos">
        <Dato titulo="Estudiantes" valor={String(e.total)} detalle={`${e.nuevos7d} nuevos y ${e.activos7d} activos en los últimos 7 días`} />
        <Dato titulo="Retención día 1" {...retencion(e.retencionD1)} />
        <Dato titulo="Retención día 7" {...retencion(e.retencionD7)} />
        <Dato titulo="Días activos por semana" valor={decimal(e.diasActivosPorSemana)} detalle="Promedio entre los activos de los últimos 7 días" />
        <Dato titulo="Lecciones completadas" valor={String(m.lecciones.total)} detalle={porUsuario(m.lecciones)} />
        <Dato titulo="Repasos completados" valor={String(m.repasos.total)} detalle={porUsuario(m.repasos)} />
        <Dato titulo="Acierto general" valor={porcentaje(m.respuestas.correctas, m.respuestas.total)} detalle={`${m.respuestas.total} respuestas`} />
        <Dato
          titulo="Reportes por cada 100 respuestas"
          valor={decimal(m.respuestas.total ? (m.reportes / m.respuestas.total) * 100 : null)}
          detalle={`${m.reportes} reporte(s)`}
        />
        <Dato
          titulo="Interés en Premium"
          valor={porcentaje(m.premium.interesados, e.total)}
          detalle={`${m.premium.interesados} tocaron "Me interesa" de ${m.premium.vieron} que vieron la pantalla${Object.keys(m.premium.porPlan).length ? ` (${Object.entries(m.premium.porPlan).map(([p, n]) => `${p}: ${n}`).join(", ")})` : ""}`}
        />
      </div>

      <h2>Premium por momento</h2>
      <p className="nota-pie">Estudiantes que vieron la oferta en cada momento y cuántos de ellos tocaron "Me interesa".</p>
      {m.premium.porOrigen.length === 0 ? (
        <p className="vacio">Todavía nadie vio la oferta.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Momento</th><th>Vieron</th><th>Me interesa</th><th>Interés</th></tr>
          </thead>
          <tbody>
            {m.premium.porOrigen.map((o) => (
              <tr key={o.origen}>
                <td>{MOMENTOS[o.origen] ?? o.origen}</td>
                <td>{o.vieron}</td>
                <td>{o.interesados}</td>
                <td>{porcentaje(o.interesados, o.vieron)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Acierto por ejercicio</h2>
      <p className="nota-pie">
        Del más bajo al más alto. Los de menos de 30% con al menos 5 respuestas pueden tener un error o estar mal redactados
        {revisar > 0 && <>: hay <strong>{revisar}</strong> para revisar</>}.
      </p>
      {m.ejercicios.length === 0 ? (
        <p className="vacio">Todavía nadie respondió ejercicios.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Ejercicio</th><th>Tipo</th><th>Respuestas</th><th>Acierto</th></tr>
          </thead>
          <tbody>
            {m.ejercicios.map((x) => (
              <tr key={x.ejercicioId}>
                <td>
                  {x.titulo ? <Link to={`/ejercicios/${x.ejercicioId}`}>{x.titulo}</Link> : <span className="vacio">Ya no existe</span>}
                  <div className="nota-pie"><code>{x.ejercicioId}</code></div>
                </td>
                <td>{x.tipo ? NOMBRES_TIPO[x.tipo] : ""}</td>
                <td>{x.intentos}</td>
                <td>
                  {porcentaje(x.correctos, x.intentos)} {x.revisar && <span className="estado estado-rechazada">Revisar</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
