import { Imagen, type Imagen as TImagen } from "@anatomia/contenido";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type RespuestaCola, type RespuestaImagen } from "../api";
import { AccionesRevision } from "../componentes/AccionesRevision";
import { Errores, Estado, NOMBRES_TIPO } from "../componentes/comun";
import { VistaImagen } from "../componentes/VistaImagen";

const Editable = Imagen.omit({ revision: true, version: true });
type Borrador = Omit<TImagen, "revision" | "version">;

const LICENCIAS: Record<TImagen["licencia"]["tipo"], string> = {
  propia: "Propia",
  dominio_publico: "Dominio público",
  cc_by: "CC BY",
  cc_by_sa: "CC BY-SA",
};

function aBorrador({ revision: _r, version: _v, ...base }: TImagen): Borrador {
  return base;
}

function mover<T>(xs: T[], i: number, delta: number): T[] {
  const j = i + delta;
  if (j < 0 || j >= xs.length) return xs;
  const copia = [...xs];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
}

export function EditorImagen() {
  const { id = "" } = useParams();
  const cliente = useQueryClient();
  const { data, error, isLoading } = useQuery({ queryKey: ["imagen", id], queryFn: () => api<RespuestaImagen>(`/admin/imagenes/${id}`) });
  const fichas = useQuery({ queryKey: ["cola", { tipo: "ficha" }], queryFn: () => api<RespuestaCola>("/admin/cola?tipo=ficha") });
  const [b, setB] = useState<Borrador | null>(null);
  const [seleccion, setSeleccion] = useState<string | undefined>();
  const [verZonas, setVerZonas] = useState(true);

  useEffect(() => {
    if (data) setB(aBorrador(data.imagen));
  }, [data]);

  const guardar = useMutation({
    mutationFn: (imagen: Borrador) => api<TImagen>(`/admin/imagenes/${id}`, { metodo: "PUT", cuerpo: imagen }),
    onSuccess: () => cliente.invalidateQueries(),
  });

  if (isLoading) return <p>Cargando…</p>;
  if (error || !data || !b) return <Errores error={error} />;

  const sinGuardar = JSON.stringify(b) !== JSON.stringify(aBorrador(data.imagen));
  const validacion = Editable.safeParse(b);
  const nombres = new Map((fichas.data?.elementos ?? []).map((f) => [f.id, f]));
  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setB({ ...b, [k]: v });

  return (
    <section className="editor">
      <h1>{b.titulo} <code>{id}</code></h1>
      <AccionesRevision
        coleccion="imagenes"
        id={id}
        estado={data.imagen.revision.estado}
        version={data.imagen.version}
        revision={data.imagen.revision}
        sinGuardar={sinGuardar}
        invalido={!validacion.success}
        guardando={guardar.isPending}
        onGuardar={() => {
          if (validacion.success) guardar.mutate(validacion.data);
        }}
      />
      {!validacion.success && sinGuardar && (
        <div className="error">
          <p>Hay que corregir esto antes de guardar:</p>
          <ul>{validacion.error.issues.map((i, n) => <li key={n}><code>{i.path.join(".")}</code> {i.message}</li>)}</ul>
        </div>
      )}
      <Errores error={guardar.error} />

      <div className="columnas columnas-imagen">
        <div>
          <label className="check-linea">
            <input type="checkbox" checked={verZonas} onChange={(e) => setVerZonas(e.target.checked)} /> Ver todas las zonas
          </label>
          <VistaImagen imagen={b} resaltada={seleccion} verZonas={verZonas} onElegir={setSeleccion} />
          <p className="nota-pie">Toca la imagen para ver qué zona recibe el toque (la de más arriba, como en la app).</p>
        </div>
        <div>
          <label>Título<input value={b.titulo} onChange={(e) => set("titulo", e.target.value)} /></label>
          <fieldset>
            <legend>Licencia</legend>
            <div className="fila">
              <select aria-label="Tipo de licencia" value={b.licencia.tipo} onChange={(e) => set("licencia", { ...b.licencia, tipo: e.target.value as TImagen["licencia"]["tipo"] })}>
                {Object.entries(LICENCIAS).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
              </select>
              <input aria-label="Fuente (URL)" placeholder="Fuente (URL)" value={b.licencia.fuente ?? ""}
                onChange={(e) => set("licencia", { ...b.licencia, fuente: e.target.value || undefined })} />
            </div>
            <input aria-label="Atribución" placeholder="Atribución (obligatoria en CC BY y CC BY-SA)" value={b.licencia.atribucion ?? ""}
              onChange={(e) => set("licencia", { ...b.licencia, atribucion: e.target.value || undefined })} />
          </fieldset>
          <label className="check-linea">
            <input type="checkbox" checked={b.sinEtiquetas} onChange={(e) => set("sinEtiquetas", e.target.checked)} /> Ya borré los nombres impresos
          </label>

          <fieldset>
            <legend>Zonas en orden de dibujo (la última queda encima)</legend>
            <ol className="zonas">
              {b.zonas.map((z, i) => {
                const ficha = nombres.get(z.fichaId);
                return (
                  <li key={z.id} className={z.id === seleccion ? "elegida" : undefined}>
                    <button type="button" className="secundario" onClick={() => setSeleccion(z.id === seleccion ? undefined : z.id)}>
                      {z.id === seleccion ? "Ocultar" : "Ver"}
                    </button>
                    <select aria-label={`Ficha de ${z.id}`} value={z.fichaId}
                      onChange={(e) => set("zonas", b.zonas.map((x, j) => (j === i ? { ...x, fichaId: e.target.value } : x)))}>
                      {!ficha && <option value={z.fichaId}>{z.fichaId} (no existe)</option>}
                      {[...nombres.values()].map((f) => <option key={f.id} value={f.id}>{f.titulo}</option>)}
                    </select>
                    {ficha ? <Estado estado={ficha.estado} /> : <span className="estado estado-rechazada">Sin ficha</span>}
                    <span className="controles">
                      <button type="button" className="secundario" aria-label="Más abajo en el dibujo" onClick={() => set("zonas", mover(b.zonas, i, -1))}>↑</button>
                      <button type="button" className="secundario" aria-label="Más arriba en el dibujo" onClick={() => set("zonas", mover(b.zonas, i, 1))}>↓</button>
                    </span>
                  </li>
                );
              })}
            </ol>
          </fieldset>

          <h2>Ejercicios de esta imagen</h2>
          <p className="nota-pie">Se crean o actualizan al aprobar la imagen: un tocar y un identificar por zona. Se conserva lo que redacte la revisora.</p>
          {data.ejercicios.length === 0 ? (
            <p className="vacio">Todavía no hay ejercicios.</p>
          ) : (
            <ul className="vinculados">
              {data.ejercicios.map((e) => (
                <li key={e.id}>
                  <Estado estado={e.revision.estado} /> {NOMBRES_TIPO[e.tipo]} · <Link to={`/ejercicios/${e.id}`}>{e.id}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
