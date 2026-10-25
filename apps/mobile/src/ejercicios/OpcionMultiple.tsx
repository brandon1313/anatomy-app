import type { Ejercicio } from "@anatomia/contenido";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { barajar } from "../leccion/flujo";
import { color, espacio, TOQUE_MINIMO } from "../tema";

type ConOpciones = Extract<Ejercicio, { tipo: "opcion_multiple" | "caso_clinico" }>;

/** Opción múltiple y caso clínico: misma forma de responder, el caso agrega el contexto. */
export function OpcionMultiple({ ejercicio: e, onResponder }: { ejercicio: ConOpciones; onResponder: (correcto: boolean) => void }) {
  const [opciones] = useState(() => barajar(e.opciones));
  const [elegida, setElegida] = useState<string | null>(null);

  return (
    <View style={{ gap: espacio.m }}>
      {e.tipo === "caso_clinico" && (
        <View style={estilos.caso}>
          <Text style={estilos.etiquetaCaso}>Caso clínico</Text>
          <Text style={estilos.textoCaso}>{e.caso}</Text>
        </View>
      )}
      <Text style={estilos.enunciado} accessibilityRole="header">{e.tipo === "caso_clinico" ? e.pregunta : e.enunciado}</Text>
      <View style={{ gap: espacio.s }} accessibilityRole="radiogroup">
        {opciones.map((o) => {
          const respondido = elegida !== null;
          const esCorrecta = o.id === e.correcta;
          const fallo = respondido && o.id === elegida && !esCorrecta;
          return (
            <Pressable
              key={o.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: o.id === elegida, disabled: respondido }}
              accessibilityLabel={`${o.texto}${respondido && esCorrecta ? ", respuesta correcta" : ""}${fallo ? ", tu respuesta, incorrecta" : ""}`}
              disabled={respondido}
              onPress={() => {
                setElegida(o.id);
                onResponder(esCorrecta);
              }}
              style={({ pressed }) => [
                estilos.opcion,
                pressed && { backgroundColor: color.fondo },
                respondido && esCorrecta && estilos.correcta,
                fallo && estilos.incorrecta,
              ]}
            >
              <Text style={estilos.textoOpcion}>{o.texto}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  caso: { backgroundColor: color.superficie, borderRadius: 12, padding: espacio.m, borderLeftWidth: 4, borderLeftColor: color.acento, gap: espacio.xs },
  etiquetaCaso: { fontSize: 13, fontWeight: "700", color: color.acento, textTransform: "uppercase" },
  textoCaso: { fontSize: 16, color: color.texto, lineHeight: 23 },
  enunciado: { fontSize: 20, fontWeight: "700", color: color.texto, lineHeight: 27 },
  opcion: { minHeight: TOQUE_MINIMO + 12, borderWidth: 2, borderColor: color.borde, borderRadius: 12, padding: espacio.m, justifyContent: "center", backgroundColor: color.superficie },
  correcta: { borderColor: color.verde, backgroundColor: color.verdeSuave },
  incorrecta: { borderColor: color.rojo, backgroundColor: color.rojoSuave },
  textoOpcion: { fontSize: 17, color: color.texto },
});
