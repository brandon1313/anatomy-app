import type { Ejercicio } from "@anatomia/contenido";
import { StyleSheet, Text, View } from "react-native";
import { color, espacio } from "../tema";
import { ListaOpciones } from "./ListaOpciones";

type ConOpciones = Extract<Ejercicio, { tipo: "opcion_multiple" | "caso_clinico" }>;

/** Opción múltiple y caso clínico: misma forma de responder, el caso agrega el contexto. */
export function OpcionMultiple({ ejercicio: e, onResponder }: { ejercicio: ConOpciones; onResponder: (correcto: boolean) => void }) {
  return (
    <View style={{ gap: espacio.m }}>
      {e.tipo === "caso_clinico" && (
        <View style={estilos.caso}>
          <Text style={estilos.etiquetaCaso}>Caso clínico</Text>
          <Text style={estilos.textoCaso}>{e.caso}</Text>
        </View>
      )}
      <Text style={estilos.enunciado} accessibilityRole="header">{e.tipo === "caso_clinico" ? e.pregunta : e.enunciado}</Text>
      <ListaOpciones opciones={e.opciones} correcta={e.correcta} onResponder={onResponder} />
    </View>
  );
}

const estilos = StyleSheet.create({
  caso: { backgroundColor: color.superficie, borderRadius: 12, padding: espacio.m, borderLeftWidth: 4, borderLeftColor: color.acento, gap: espacio.xs },
  etiquetaCaso: { fontSize: 13, fontWeight: "700", color: color.acento, textTransform: "uppercase" },
  textoCaso: { fontSize: 16, color: color.texto, lineHeight: 23 },
  enunciado: { fontSize: 20, fontWeight: "700", color: color.texto, lineHeight: 27 },
});
