import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api, type ResultadoGeneracion } from "../api";
import { Errores } from "../componentes/comun";

export function Generar() {
  const [musculos, setMusculos] = useState("");
  const cliente = useQueryClient();
  const lista = musculos.split(/[\n,]/).map((m) => m.trim()).filter(Boolean);
  const generar = useMutation({
    mutationFn: () =>
      api<{ resultados: ResultadoGeneracion[] }>("/admin/generar", { metodo: "POST", cuerpo: { unidad: "musculos-muslo", musculos: lista } }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ["cola"] }),
  });

  return (
    <section>
      <h1>Generar contenido</h1>
      <p>
        La IA redacta la ficha y 4 ejercicios de texto por músculo. Todo entra como <strong>borrador</strong> y nada se publica sin tu aprobación.
        Cada músculo tarda alrededor de un minuto.
      </p>
      <label>
        Unidad
        <select disabled value="musculos-muslo"><option value="musculos-muslo">Músculos del muslo</option></select>
      </label>
      <label>
        Músculos (uno por línea o separados por coma)
        <textarea rows={6} value={musculos} onChange={(e) => setMusculos(e.target.value)} placeholder={"Recto femoral\nVasto lateral"} />
      </label>
      <button disabled={lista.length === 0 || lista.length > 15 || generar.isPending} onClick={() => generar.mutate()}>
        {generar.isPending ? `Generando ${lista.length}…` : `Generar ${lista.length || ""}`}
      </button>
      {lista.length > 15 && <p className="error">Máximo 15 músculos por vez.</p>}
      <Errores error={generar.error} />
      {generar.data && (
        <ul className="resultados">
          {generar.data.resultados.map((r) => (
            <li key={r.musculo} className={`resultado-${r.estado}`}>
              <strong>{r.musculo}</strong>:{" "}
              {r.estado === "creado" && <>creada <Link to={`/fichas/${r.fichaId}`}>{r.fichaId}</Link> con {r.ejercicioIds.length} ejercicios ({r.intentos} {r.intentos === 1 ? "intento" : "intentos"})</>}
              {r.estado === "omitido" && <>omitido — {r.motivo} (<Link to={`/fichas/${r.fichaId}`}>{r.fichaId}</Link>)</>}
              {r.estado === "fallido" && (
                <>falló después de {r.intentos} {r.intentos === 1 ? "intento" : "intentos"}<ul>{r.errores.map((e, i) => <li key={i}>{e}</li>)}</ul></>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
