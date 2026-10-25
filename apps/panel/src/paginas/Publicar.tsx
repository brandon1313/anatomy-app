import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Conteos, type RespuestaPaquetes } from "../api";
import { Errores } from "../componentes/comun";

const contar = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const describir = (c: Conteos) =>
  [
    contar(c.lecciones, "lección", "lecciones"),
    contar(c.fichas, "ficha", "fichas"),
    contar(c.ejercicios, "ejercicio", "ejercicios"),
    contar(c.imagenes, "imagen", "imágenes"),
  ].join(" · ");

export function Publicar() {
  const cliente = useQueryClient();
  const { data, error, isLoading } = useQuery({ queryKey: ["paquetes"], queryFn: () => api<RespuestaPaquetes>("/admin/paquetes") });
  const publicar = useMutation({
    mutationFn: () => api<{ version: number; conteos: Conteos }>("/admin/publicar", { metodo: "POST" }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ["paquetes"] }),
  });

  if (isLoading) return <p>Cargando…</p>;
  if (!data) return <Errores error={error} />;
  const { siguiente, historial } = data;

  return (
    <section>
      <h1>Publicar</h1>
      <p>El paquete lleva solo lo aprobado. Cada publicación crea una versión nueva; las anteriores no se modifican.</p>
      <div className="tarjeta">
        <h2>Versión {siguiente.version}</h2>
        {siguiente.errores.length > 0 ? (
          <div className="error">
            <p>No se puede publicar todavía:</p>
            <ul>{siguiente.errores.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        ) : siguiente.sinCambios ? (
          <p className="vacio">No hay cambios desde la última versión.</p>
        ) : (
          siguiente.conteos && <p>Lista para publicar: {describir(siguiente.conteos)}.</p>
        )}
        <button
          className="aprobar"
          disabled={siguiente.errores.length > 0 || siguiente.sinCambios || publicar.isPending}
          onClick={() => window.confirm(`¿Publicar la versión ${siguiente.version}? Los estudiantes la recibirán al abrir la app.`) && publicar.mutate()}
        >
          {publicar.isPending ? "Publicando…" : `Publicar versión ${siguiente.version}`}
        </button>
        {publicar.data && <p className="exito">Versión {publicar.data.version} publicada.</p>}
        <Errores error={publicar.error} />
      </div>

      <h2>Historial</h2>
      {historial.length === 0 ? (
        <p className="vacio">Todavía no se ha publicado nada.</p>
      ) : (
        <table>
          <thead><tr><th>Versión</th><th>Contenido</th><th>Publicó</th><th>Fecha</th></tr></thead>
          <tbody>
            {historial.map((p) => (
              <tr key={p.version}>
                <td>{p.version}</td>
                <td>{describir(p.conteos)}</td>
                <td>{p.publicadoPor}</td>
                <td>{new Date(p.publicadoEn).toLocaleString("es")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
