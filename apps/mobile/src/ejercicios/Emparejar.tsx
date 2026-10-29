import type { Ejercicio } from "@anatomia/contenido";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { barajar, calificarEmparejar } from "../leccion/flujo";
import { efecto } from "../lib/efectos";
import { color, espacio, fuente, TOQUE_MINIMO } from "../tema";
import { estilosTexto } from "./OpcionMultiple";
import type { PropsEjercicio } from "./tipos";

type TEmparejar = Extract<Ejercicio, { tipo: "emparejar" }>;

/** Colores para distinguir qué elemento se unió con cuál. */
const COLORES_PAR = ["#5a4bf0", "#009e8f", "#e0503a", "#c27c00", "#c42f86"];

/** Los pares se arman y se deshacen libremente; con todos unidos se puede comprobar y los incorrectos quedan en rojo. */
export function Emparejar({ ejercicio: e, comprobado, onElegir }: PropsEjercicio & { ejercicio: TEmparejar }) {
  const [derechas] = useState(() => barajar(e.pares.map((_, i) => i)));
  const [seleccion, setSeleccion] = useState<number | null>(null);
  /** uniones[izquierda] = índice del par cuyo texto derecho se eligió. */
  const [uniones, setUniones] = useState<(number | undefined)[]>(() => e.pares.map(() => undefined));
  const calificacion = comprobado ? calificarEmparejar(e.pares, uniones as number[]) : null;
  const izquierdaDe = (derecha: number) => uniones.findIndex((u) => u === derecha);

  function unir(nuevas: (number | undefined)[]) {
    setUniones(nuevas);
    const completo = nuevas.every((u) => u !== undefined);
    if (!completo) return onElegir(null);
    const c = calificarEmparejar(e.pares, nuevas as number[]);
    onElegir({ correcto: c.correcto, detalle: c.correcto ? undefined : "Los pares en rojo no van juntos." });
  }

  function tocarIzquierda(i: number) {
    if (comprobado) return;
    if (uniones[i] !== undefined) unir(uniones.map((u, j) => (j === i ? undefined : u)));
    setSeleccion(seleccion === i ? null : i);
    efecto("elegir");
  }

  function tocarDerecha(d: number) {
    if (comprobado) return;
    if (seleccion === null) {
      const i = izquierdaDe(d);
      if (i >= 0) unir(uniones.map((u, j) => (j === i ? undefined : u)));
      return;
    }
    unir(uniones.map((u, j) => (j === seleccion ? d : u === d ? undefined : u)));
    setSeleccion(null);
    efecto("elegir");
  }

  const estiloResultado = (i: number) =>
    calificacion ? (calificacion.incorrectos.includes(i) ? estilos.incorrecta : estilos.correcta) : null;

  return (
    <View style={{ gap: espacio.m }}>
      <Text style={estilosTexto.enunciado} accessibilityRole="header">{e.enunciado}</Text>
      <Text style={estilosTexto.ayuda}>Toca un elemento de cada columna para unirlos.</Text>
      <View style={estilos.columnas}>
        <View style={estilos.columna}>
          {e.pares.map((p, i) => {
            const par = uniones[i];
            return (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityState={{ selected: seleccion === i, disabled: comprobado }}
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
                accessibilityState={{ disabled: comprobado }}
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
    </View>
  );
}

const estilos = StyleSheet.create({
  columnas: { flexDirection: "row", gap: espacio.s },
  columna: { flex: 1, gap: espacio.s },
  elemento: { minHeight: TOQUE_MINIMO + 16, borderWidth: 2, borderBottomWidth: 4, borderColor: color.borde, borderRadius: 14, padding: espacio.s + 2, justifyContent: "center", backgroundColor: color.superficie },
  seleccionado: { borderColor: color.acentoBorde, backgroundColor: color.acentoSuave },
  correcta: { borderColor: color.verdeBoton, backgroundColor: color.verdeSuave },
  incorrecta: { borderColor: color.rojoBoton, backgroundColor: color.rojoSuave },
  texto: { fontSize: 15, fontFamily: fuente.media, color: color.texto },
});
