import { FichaMusculoBase, type FichaMusculo } from "@anatomia/contenido";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type RespuestaFicha } from "../api";
import { AccionesRevision } from "../componentes/AccionesRevision";
import { Errores, Estado, ListaTextos, NOMBRES_TIPO } from "../componentes/comun";

type Borrador = FichaMusculoBase;

function aBorrador({ revision: _r, version: _v, ...base }: FichaMusculo): Borrador {
  return base;
}

/** Los campos opcionales vacíos se mandan como ausentes, no como "". */
function limpiar(b: Borrador): Borrador {
  const o = (s?: string) => (s?.trim() ? s.trim() : undefined);
  return {
    ...b,
    nombre: { ...b.nombre, latin: o(b.nombre.latin), sinonimos: b.nombre.sinonimos.map((s) => s.trim()).filter(Boolean) },
    compartimento: o(b.compartimento),
    origen: b.origen.map((s) => s.trim()),
    insercion: b.insercion.map((s) => s.trim()),
    acciones: b.acciones.map((s) => s.trim()),
    inervacion: b.inervacion.map((i) => ({ nervio: i.nervio.trim(), raices: o(i.raices) })),
    notaClinica: o(b.notaClinica),
    referencias: b.referencias.map((r) => ({ libro: r.libro, edicion: o(r.edicion), capitulo: o(r.capitulo), pagina: o(r.pagina) })),
  };
}

export function EditorFicha() {
  const { id = "" } = useParams();
  const cliente = useQueryClient();
  const { data, error, isLoading } = useQuery({ queryKey: ["ficha", id], queryFn: () => api<RespuestaFicha>(`/admin/fichas/${id}`) });
  const [b, setB] = useState<Borrador | null>(null);

  useEffect(() => {
    if (data) setB(aBorrador(data.ficha));
  }, [data]);

  const guardar = useMutation({
    mutationFn: (ficha: Borrador) => api<FichaMusculo>(`/admin/fichas/${id}`, { metodo: "PUT", cuerpo: ficha }),
    onSuccess: () => cliente.invalidateQueries(),
  });

  if (isLoading) return <p>Cargando…</p>;
  if (error || !data || !b) return <Errores error={error} />;

  const limpio = limpiar(b);
  const sinGuardar = JSON.stringify(limpio) !== JSON.stringify(limpiar(aBorrador(data.ficha)));
  const validacion = FichaMusculoBase.safeParse(limpio);
  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setB({ ...b, [k]: v });

  return (
    <section className="editor">
      <h1>{b.nombre.principal || id} <code>{id}</code></h1>
      <AccionesRevision
        coleccion="fichas"
        id={id}
        estado={data.ficha.revision.estado}
        version={data.ficha.version}
        revision={data.ficha.revision}
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

      <div className="columnas">
        <div>
          <fieldset>
            <legend>Nombre</legend>
            <label>Principal<input value={b.nombre.principal} onChange={(e) => set("nombre", { ...b.nombre, principal: e.target.value })} /></label>
            <label>Latín<input value={b.nombre.latin ?? ""} onChange={(e) => set("nombre", { ...b.nombre, latin: e.target.value })} /></label>
          </fieldset>
          <ListaTextos etiqueta="Sinónimos (también se aceptan como respuesta)" valores={b.nombre.sinonimos} onChange={(v) => set("nombre", { ...b.nombre, sinonimos: v })} />
          <div className="fila">
            <label>Región<input value={b.region} onChange={(e) => set("region", e.target.value)} /></label>
            <label>Compartimento<input value={b.compartimento ?? ""} onChange={(e) => set("compartimento", e.target.value)} /></label>
          </div>
          <ListaTextos etiqueta="Origen" valores={b.origen} onChange={(v) => set("origen", v)} />
          <ListaTextos etiqueta="Inserción" valores={b.insercion} onChange={(v) => set("insercion", v)} />
          <ListaTextos etiqueta="Acciones" valores={b.acciones} onChange={(v) => set("acciones", v)} />
        </div>
        <div>
          <fieldset>
            <legend>Inervación</legend>
            {b.inervacion.map((n, i) => (
              <div className="fila" key={i}>
                <input aria-label="Nervio" placeholder="Nervio" value={n.nervio}
                  onChange={(e) => set("inervacion", b.inervacion.map((x, j) => (j === i ? { ...x, nervio: e.target.value } : x)))} />
                <input aria-label="Raíces" placeholder="Raíces (L2–L4)" className="corto" value={n.raices ?? ""}
                  onChange={(e) => set("inervacion", b.inervacion.map((x, j) => (j === i ? { ...x, raices: e.target.value } : x)))} />
                <button type="button" className="secundario" aria-label="Quitar" onClick={() => set("inervacion", b.inervacion.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            <button type="button" className="secundario" onClick={() => set("inervacion", [...b.inervacion, { nervio: "" }])}>+ Agregar</button>
          </fieldset>
          <label>
            Nota clínica
            <textarea rows={3} value={b.notaClinica ?? ""} onChange={(e) => set("notaClinica", e.target.value)} />
          </label>
          <fieldset>
            <legend>Referencias (dónde verificar; nunca se copia texto del libro)</legend>
            {b.referencias.map((r, i) => {
              const cambiar = (campo: string, valor: string) =>
                set("referencias", b.referencias.map((x, j) => (j === i ? { ...x, [campo]: valor } : x)));
              return (
                <div className="fila" key={i}>
                  <select aria-label="Libro" value={r.libro} onChange={(e) => cambiar("libro", e.target.value)}>
                    <option value="tortora">Tortora</option>
                    <option value="kendall">Kendall</option>
                  </select>
                  <input aria-label="Edición" placeholder="Edición" className="corto" value={r.edicion ?? ""} onChange={(e) => cambiar("edicion", e.target.value)} />
                  <input aria-label="Capítulo" placeholder="Capítulo" className="corto" value={r.capitulo ?? ""} onChange={(e) => cambiar("capitulo", e.target.value)} />
                  <input aria-label="Página" placeholder="Página" className="corto" value={r.pagina ?? ""} onChange={(e) => cambiar("pagina", e.target.value)} />
                  <button type="button" className="secundario" aria-label="Quitar" onClick={() => set("referencias", b.referencias.filter((_, j) => j !== i))}>✕</button>
                </div>
              );
            })}
            <button type="button" className="secundario" onClick={() => set("referencias", [...b.referencias, { libro: "tortora" }])}>+ Agregar</button>
          </fieldset>

          <h2>Ejercicios vinculados</h2>
          {data.ejercicios.length === 0 ? (
            <p className="vacio">Esta ficha no tiene ejercicios.</p>
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
