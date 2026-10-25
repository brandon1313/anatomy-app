import { Curso as EsquemaCurso, type Curso as TCurso } from "@anatomia/contenido";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type ElementoCola, type RespuestaCola } from "../api";
import { Errores, Estado, NOMBRES_TIPO } from "../componentes/comun";

type Leccion = TCurso["unidades"][number]["lecciones"][number];

/** Curso inicial de la beta: una unidad, sin lecciones todavía. */
const CURSO_INICIAL: TCurso = {
  id: "miembro-inferior",
  titulo: "Miembro inferior",
  carreras: ["fisioterapia"],
  unidades: [{ id: "musculos-muslo", titulo: "Músculos del muslo", orden: 0, lecciones: [] }],
};

function slug(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** El id de la lección es estable: el progreso del estudiante depende de él. */
function idNuevo(titulo: string, usados: Set<string>) {
  const base = slug(titulo) || "leccion";
  let id = base;
  for (let n = 2; usados.has(id); n++) id = `${base}-${n}`;
  return id;
}

function mover<T>(xs: T[], i: number, delta: number): T[] {
  const j = i + delta;
  if (j < 0 || j >= xs.length) return xs;
  const copia = [...xs];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
}

function EditorLeccion(props: {
  leccion: Leccion;
  ejercicios: Map<string, ElementoCola>;
  porFicha: Map<string, ElementoCola[]>;
  nombresFicha: Map<string, string>;
  onChange: (l: Leccion) => void;
  onMover: (delta: number) => void;
  onQuitar: () => void;
}) {
  const { leccion: l, ejercicios, porFicha, nombresFicha, onChange } = props;
  const agregar = (ids: string[]) => onChange({ ...l, ejercicioIds: [...l.ejercicioIds, ...ids.filter((id) => !l.ejercicioIds.includes(id))] });

  return (
    <fieldset className="leccion">
      <legend>
        Lección {l.orden + 1} <code>{l.id}</code>
      </legend>
      <div className="fila">
        <input aria-label="Título de la lección" value={l.titulo} onChange={(e) => onChange({ ...l, titulo: e.target.value })} />
        <button type="button" className="secundario" aria-label="Subir lección" onClick={() => props.onMover(-1)}>↑</button>
        <button type="button" className="secundario" aria-label="Bajar lección" onClick={() => props.onMover(1)}>↓</button>
        <button type="button" className="rechazar" onClick={props.onQuitar}>Quitar lección</button>
      </div>
      <ol className="ejercicios-leccion">
        {l.ejercicioIds.map((id, i) => {
          const e = ejercicios.get(id);
          return (
            <li key={id}>
              {e ? <Estado estado={e.estado} /> : <span className="estado estado-rechazada">No existe</span>}{" "}
              <span className="tipo">{e ? NOMBRES_TIPO[e.tipo] : ""}</span> <Link to={`/ejercicios/${id}`}>{e?.titulo ?? id}</Link>
              <span className="controles">
                <button type="button" className="secundario" aria-label="Subir" onClick={() => onChange({ ...l, ejercicioIds: mover(l.ejercicioIds, i, -1) })}>↑</button>
                <button type="button" className="secundario" aria-label="Bajar" onClick={() => onChange({ ...l, ejercicioIds: mover(l.ejercicioIds, i, 1) })}>↓</button>
                <button type="button" className="secundario" aria-label="Quitar" onClick={() => onChange({ ...l, ejercicioIds: l.ejercicioIds.filter((x) => x !== id) })}>✕</button>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="fila">
        <select value="" aria-label="Agregar los ejercicios de una ficha" onChange={(e) => agregar((porFicha.get(e.target.value) ?? []).map((x) => x.id))}>
          <option value="">+ Agregar todos los ejercicios de una ficha…</option>
          {[...porFicha.keys()].map((f) => <option key={f} value={f}>{nombresFicha.get(f) ?? f}</option>)}
        </select>
        <select value="" aria-label="Agregar un ejercicio" onChange={(e) => e.target.value && agregar([e.target.value])}>
          <option value="">+ Agregar un ejercicio…</option>
          {[...ejercicios.values()].filter((e) => !l.ejercicioIds.includes(e.id)).map((e) => (
            <option key={e.id} value={e.id}>{e.id} · {NOMBRES_TIPO[e.tipo]}</option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}

export function Curso() {
  const cliente = useQueryClient();
  const consultaCurso = useQuery({ queryKey: ["curso"], queryFn: () => api<{ curso: TCurso | null }>("/admin/curso") });
  const consultaTodo = useQuery({ queryKey: ["cola", { todo: true }], queryFn: () => api<RespuestaCola>("/admin/cola") });
  const [c, setC] = useState<TCurso | null>(null);

  useEffect(() => {
    if (consultaCurso.data) setC(consultaCurso.data.curso ?? CURSO_INICIAL);
  }, [consultaCurso.data]);

  const guardar = useMutation({
    mutationFn: (curso: TCurso) => api<TCurso>("/admin/curso", { metodo: "PUT", cuerpo: curso }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ["curso"] }),
  });

  if (consultaCurso.isLoading || consultaTodo.isLoading) return <p>Cargando…</p>;
  if (!c || !consultaTodo.data) return <Errores error={consultaCurso.error ?? consultaTodo.error} />;

  const elementos = consultaTodo.data.elementos;
  const ejercicios = new Map(elementos.filter((e) => e.coleccion === "ejercicios").map((e) => [e.id, e]));
  const nombresFicha = new Map(elementos.filter((e) => e.coleccion === "fichas").map((f) => [f.id, f.titulo]));
  const porFicha = new Map<string, ElementoCola[]>();
  for (const e of ejercicios.values()) {
    for (const f of e.fichaIds ?? []) porFicha.set(f, [...(porFicha.get(f) ?? []), e]);
  }

  const unidad = c.unidades[0];
  const original = consultaCurso.data?.curso;
  const sinGuardar = JSON.stringify(c) !== JSON.stringify(original ?? CURSO_INICIAL) || !original;
  const validacion = EsquemaCurso.safeParse(c);
  const pendientes = unidad.lecciones.flatMap((l) => l.ejercicioIds).filter((id) => ejercicios.get(id)?.estado !== "aprobada");

  const cambiarLecciones = (lecciones: Leccion[]) =>
    setC({ ...c, unidades: [{ ...unidad, lecciones: lecciones.map((l, i) => ({ ...l, orden: i })) }] });

  return (
    <section className="editor">
      <h1>Curso: {c.titulo}</h1>
      <div className="acciones">
        <div className="botones">
          <button disabled={!sinGuardar || !validacion.success || guardar.isPending} onClick={() => validacion.success && guardar.mutate(validacion.data)}>
            {guardar.isPending ? "Guardando…" : "Guardar curso"}
          </button>
          <button
            type="button"
            className="secundario"
            onClick={() => {
              const titulo = window.prompt("Título de la lección")?.trim();
              if (!titulo) return;
              const usados = new Set(unidad.lecciones.map((l) => l.id));
              cambiarLecciones([...unidad.lecciones, { id: idNuevo(titulo, usados), titulo, orden: unidad.lecciones.length, ejercicioIds: [] }]);
            }}
          >
            + Nueva lección
          </button>
        </div>
        {pendientes.length > 0 && (
          <p className="aviso">{pendientes.length} ejercicio(s) de las lecciones todavía no están aprobados; publicar queda bloqueado hasta aprobarlos o quitarlos.</p>
        )}
      </div>
      {!validacion.success && unidad.lecciones.length > 0 && (
        <div className="error">
          <p>Hay que corregir esto antes de guardar:</p>
          <ul>{validacion.error.issues.map((i, n) => <li key={n}><code>{i.path.join(".")}</code> {i.message}</li>)}</ul>
        </div>
      )}
      <Errores error={guardar.error} />

      <label>
        Unidad
        <input value={unidad.titulo} onChange={(e) => setC({ ...c, unidades: [{ ...unidad, titulo: e.target.value }] })} />
      </label>
      {unidad.lecciones.length === 0 && <p className="vacio">Todavía no hay lecciones. Crea la primera con "+ Nueva lección".</p>}
      {unidad.lecciones.map((l, i) => (
        <EditorLeccion
          key={l.id}
          leccion={l}
          ejercicios={ejercicios}
          porFicha={porFicha}
          nombresFicha={nombresFicha}
          onChange={(nueva) => cambiarLecciones(unidad.lecciones.map((x, j) => (j === i ? nueva : x)))}
          onMover={(delta) => cambiarLecciones(mover(unidad.lecciones, i, delta))}
          onQuitar={() => window.confirm(`¿Quitar la lección "${l.titulo}"?`) && cambiarLecciones(unidad.lecciones.filter((_, j) => j !== i))}
        />
      ))}
    </section>
  );
}
