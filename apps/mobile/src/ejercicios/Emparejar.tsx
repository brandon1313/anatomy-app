import type { Ejercicio } from "@anatomia/contenido";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Boton } from "../componentes/Boton";
import { barajar, calificarEmparejar } from "../leccion/flujo";
import { color, espacio, TOQUE_MINIMO } from "../tema";

type TEmparejar = Extract<Ejercicio, { tipo: "emparejar" }>;

/** Colores para distinguir qué elemento se unió con cuál. */
const COLORES_PAR = ["#1f5fa8", "#8a4fbf", "#b06000", "#00796b", "#c2185b"];

export function Emparejar({ ejercicio: e, onResponder }: { ejercicio: TEmparejar; onResponder: (correcto: boolean) => void }) {
  const [derechas] = useState(() => barajar(e.pares.map((_, i) => i)));
  const [seleccion, setSeleccion] = useState<number | null>(null);
  /** uniones[izquierda] = índice del par cuyo texto derecho se eligió. */
  const [uniones, setUniones] = useState<(number | undefined)[]>(() => e.pares.map(() => undefined));
  const [calificacion, setCalificacion] = useState<ReturnType<typeof calificarEmparejar> | null>(null);

  const completo = uniones.every((u) => u !== undefined);
  const izquierdaDe = (derecha: number) => uniones.findIndex((u) => u === derecha);

  function tocarIzquierda(i: number) {
    if (calificacion) return;
    if (uniones[i] !== undefined) setUniones(uniones.map((u, j) => (j === i ? undefined : u)));
    setSeleccion(seleccion === i ? null : i);
  }

  function tocarDerecha(d: number) {
    if (calificacion) return;
    if (seleccion === null) {
      const i = izquierdaDe(d);
      if (i >= 0) setUniones(uniones.map((u, j) => (j === i ? undefined : u)));
      return;
    }
    setUniones(uniones.map((u, j) => (j === seleccion ? d : u === d ? undefined : u)));
    setSeleccion(null);
  }

  function comprobar() {
    const c = calificarEmparejar(e.pares, uniones as number[]);
    setCalificacion(c);
    onResponder(c.correcto);
  }

  const estiloResultado = (i: number) =>
    calificacion ? (calificacion.incorrectos.includes(i) ? estilos.incorrecta : estilos.correcta) : null;

  return (
    <View style={{ gap: espacio.m }}>
      <Text style={estilos.enunciado} accessibilityRole="header">{e.enunciado}</Text>
      <Text style={estilos.ayuda}>Toca un elemento de cada columna para unirlos.</Text>
      <View style={estilos.columnas}>
        <View style={estilos.columna}>
          {e.pares.map((p, i) => {
            const par = uniones[i];
            return (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityState={{ selected: seleccion === i }}
                accessibilityLabel={`${p.izquierda}${par !== undefined ? `, unido con ${e.pares[par].derecha}` : ""}`}
                onPress={() => tocarIzquierda(i)}
                style={[
                  estilos.elemento,
                  seleccion === i && estilos.seleccionado,
                  par !== undefined && { borderColor: COLORES_PAR[i % COLORES_PAR.length] },
                  estiloResultado(i),
                ]}
              >
                <Text style={estilos.texto}>{p.izquierda}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={estilos.columna}>
          {derechas.map((d) => {
            const i = izquierdaDe(d);
            return (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityLabel={`${e.pares[d].derecha}${i >= 0 ? `, unido con ${e.pares[i].izquierda}` : ""}`}
                onPress={() => tocarDerecha(d)}
                style={[estilos.elemento, i >= 0 && { borderColor: COLORES_PAR[i % COLORES_PAR.length] }, i >= 0 && estiloResultado(i)]}
              >
                <Text style={estilos.texto}>{e.pares[d].derecha}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {!calificacion && <Boton titulo="Comprobar" onPress={comprobar} deshabilitado={!completo} />}
    </View>
  );
}

const estilos = StyleSheet.create({
  enunciado: { fontSize: 20, fontWeight: "700", color: color.texto, lineHeight: 27 },
  ayuda: { fontSize: 15, color: color.tenue },
  columnas: { flexDirection: "row", gap: espacio.s },
  columna: { flex: 1, gap: espacio.s },
  elemento: { minHeight: TOQUE_MINIMO + 16, borderWidth: 2, borderColor: color.borde, borderRadius: 12, padding: espacio.s + 2, justifyContent: "center", backgroundColor: color.superficie },
  seleccionado: { borderColor: color.acento, backgroundColor: "#e8f0fa" },
  correcta: { borderColor: color.verde, backgroundColor: color.verdeSuave },
  incorrecta: { borderColor: color.rojo, backgroundColor: color.rojoSuave },
  texto: { fontSize: 15, color: color.texto },
});
