import { EjercicioBase, type Ejercicio } from "@anatomia/contenido";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { z } from "zod";
import { api, type RespuestaEjercicio, type RespuestaImagen } from "../api";
import { AccionesRevision } from "../componentes/AccionesRevision";
import { Errores, Estado, NOMBRES_TIPO } from "../componentes/comun";
import { VistaImagen } from "../componentes/VistaImagen";

type Borrador = z.infer<typeof EjercicioBase>;
type ConOpciones = Extract<Borrador, { opciones: unknown }>;

function aBorrador({ revision: _r, version: _v, ...base }: Ejercicio): Borrador {
  return base as Borrador;
}

function Opciones({ e, onChange }: { e: ConOpciones; onChange: (e: ConOpciones) => void }) {
  return (
    <fieldset>
      <legend>Opciones (marca la correcta)</legend>
      {e.opciones.map((o, i) => (
        <div className="fila" key={i}>
          <input type="radio" name="correcta" aria-label={`Correcta: ${o.id}`} checked={e.correcta === o.id} onChange={() => onChange({ ...e, correcta: o.id })} />
          <code>{o.id}</code>
          <input aria-label={`Opción ${o.id}`} value={o.texto}
            onChange={(ev) => onChange({ ...e, opciones: e.opciones.map((x, j) => (j === i ? { ...x, texto: ev.target.value } : x)) })} />
          <button type="button" className="secundario" aria-label="Quitar" disabled={e.opciones.length <= 2}
            onClick={() => onChange({ ...e, opciones: e.opciones.filter((_, j) => j !== i) })}>✕</button>
        </div>
      ))}
      {e.opciones.length < 5 && (
        <button type="button" className="secundario"
          onClick={() => {
            const usados = new Set(e.opciones.map((o) => o.id));
            const id = "abcde".split("").find((l) => !usados.has(l))!;
            onChange({ ...e, opciones: [...e.opciones, { id, texto: "" }] });
          }}>
          + Agregar opción
        </button>
      )}
    </fieldset>
  );
}

/** La imagen del ejercicio con la zona que pregunta (en la app, la de tocar no se resalta hasta responder). */
function ImagenDelEjercicio({ e }: { e: Extract<Borrador, { imagenId: string }> }) {
  const { data } = useQuery({ queryKey: ["imagen", e.imagenId], queryFn: () => api<RespuestaImagen>(`/admin/imagenes/${e.imagenId}`) });
  if (!data) return <p className="vacio">Cargando la imagen…</p>;
  return (
    <>
      <VistaImagen imagen={data.imagen} resaltada={e.tipo === "identificar_imagen" ? e.zonaResaltada : e.zonaCorrecta} />
      <p className="nota-pie">
        Zona <code>{e.tipo === "identificar_imagen" ? e.zonaResaltada : e.zonaCorrecta}</code> de <Link to={`/imagenes/${e.imagenId}`}>{e.imagenId}</Link>
        {e.tipo === "tocar_estructura" && " (en la app se marca después de responder)"}
      </p>
    </>
  );
}

/** Vista previa parecida a la app (sin barajar, con la correcta marcada). */
function VistaPrevia({ e }: { e: Borrador }) {
  return (
    <div className="vista-previa">
      <h2>Vista previa</h2>
      {"imagenId" in e && <ImagenDelEjercicio e={e} />}
      {e.tipo === "caso_clinico" && <p className="caso">{e.caso}</p>}
      <p className="enunciado">{e.tipo === "caso_clinico" ? e.pregunta : "enunciado" in e ? e.enunciado : "¿Qué estructura está resaltada?"}</p>
      {"opciones" in e && (
        <ul className="opciones">
          {e.opciones.map((o) => <li key={o.id} className={o.id === e.correcta ? "correcta" : ""}>{o.texto}</li>)}
        </ul>
      )}
      {e.tipo === "emparejar" && (
        <ul className="opciones">
          {e.pares.map((p, i) => <li key={i}>{p.izquierda} ↔ {p.derecha}</li>)}
        </ul>
      )}
      <p className="explicacion">{e.explicacion}</p>
    </div>
  );
}

export function EditorEjercicio() {
  const { id = "" } = useParams();
  const cliente = useQueryClient();
  const { data, error, isLoading } = useQuery({ queryKey: ["ejercicio", id], queryFn: () => api<RespuestaEjercicio>(`/admin/ejercicios/${id}`) });
  const [b, setB] = useState<Borrador | null>(null);

  useEffect(() => {
    if (data) setB(aBorrador(data.ejercicio));
  }, [data]);

  const guardar = useMutation({
    mutationFn: (e: Borrador) => api<Ejercicio>(`/admin/ejercicios/${id}`, { metodo: "PUT", cuerpo: e }),
    onSuccess: () => cliente.invalidateQueries(),
  });

  if (isLoading) return <p>Cargando…</p>;
  if (error || !data || !b) return <Errores error={error} />;

  const sinGuardar = JSON.stringify(b) !== JSON.stringify(aBorrador(data.ejercicio));
  const validacion = EjercicioBase.safeParse(b);
  const deImagen = b.tipo === "identificar_imagen" || b.tipo === "tocar_estructura";

  return (
    <section className="editor">
      <p><Link to="/cola">← Cola</Link></p>
      <h1>{NOMBRES_TIPO[b.tipo]} <code>{id}</code></h1>
      <p>
        Fichas:{" "}
        {data.fichas.map((f) => (
          <span key={f.id}><Link to={`/fichas/${f.id}`}>{f.nombre}</Link> <Estado estado={f.estado} /> </span>
        ))}
      </p>
      <AccionesRevision
        coleccion="ejercicios"
        id={id}
        estado={data.ejercicio.revision.estado}
        version={data.ejercicio.version}
        revision={data.ejercicio.revision}
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
          {deImagen && (
            <p className="nota-pie">
              La zona y las opciones salen de la imagen y se recalculan al aprobarla; el enunciado, la explicación y la dificultad que escribas se conservan.
            </p>
          )}
          <label>
            Dificultad
            <select value={b.dificultad} onChange={(e) => setB({ ...b, dificultad: Number(e.target.value) as 1 | 2 | 3 })}>
              <option value={1}>1 · dato directo</option>
              <option value={2}>2 · relacionar datos</option>
              <option value={3}>3 · razonamiento clínico</option>
            </select>
          </label>
          {b.tipo === "caso_clinico" && (
            <>
              <label>Caso<textarea rows={4} value={b.caso} onChange={(e) => setB({ ...b, caso: e.target.value })} /></label>
              <label>Pregunta<input value={b.pregunta} onChange={(e) => setB({ ...b, pregunta: e.target.value })} /></label>
            </>
          )}
          {(b.tipo === "opcion_multiple" || b.tipo === "emparejar" || b.tipo === "tocar_estructura") && (
            <label>Enunciado<textarea rows={2} value={b.enunciado} onChange={(e) => setB({ ...b, enunciado: e.target.value })} /></label>
          )}
          {"opciones" in b && <Opciones e={b} onChange={setB} />}
          {b.tipo === "emparejar" && (
            <fieldset>
              <legend>Pares (la app baraja la columna derecha)</legend>
              {b.pares.map((p, i) => {
                const cambiar = (lado: "izquierda" | "derecha", v: string) =>
                  setB({ ...b, pares: b.pares.map((x, j) => (j === i ? { ...x, [lado]: v } : x)) });
                return (
                  <div className="fila" key={i}>
                    <input aria-label="Izquierda" value={p.izquierda} onChange={(e) => cambiar("izquierda", e.target.value)} />
                    <input aria-label="Derecha" value={p.derecha} onChange={(e) => cambiar("derecha", e.target.value)} />
                    <button type="button" className="secundario" aria-label="Quitar" disabled={b.pares.length <= 3}
                      onClick={() => setB({ ...b, pares: b.pares.filter((_, j) => j !== i) })}>✕</button>
                  </div>
                );
              })}
              {b.pares.length < 5 && (
                <button type="button" className="secundario" onClick={() => setB({ ...b, pares: [...b.pares, { izquierda: "", derecha: "" }] })}>
                  + Agregar par
                </button>
              )}
            </fieldset>
          )}
          <label>Explicación (máximo 2 oraciones)<textarea rows={3} value={b.explicacion} onChange={(e) => setB({ ...b, explicacion: e.target.value })} /></label>
        </div>
        <VistaPrevia e={b} />
      </div>
    </section>
  );
}
