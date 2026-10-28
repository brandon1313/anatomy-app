import type { Ejercicio } from "@anatomia/contenido";
import { StyleSheet, Text, View } from "react-native";
import { color, espacio, fuente } from "../tema";
import { ListaOpciones } from "./ListaOpciones";
import type { PropsEjercicio } from "./tipos";

type ConOpciones = Extract<Ejercicio, { tipo: "opcion_multiple" | "caso_clinico" }>;

/** Opción múltiple y caso clínico: misma forma de responder, el caso agrega el contexto. */
export function OpcionMultiple({ ejercicio: e, ...props }: PropsEjercicio & { ejercicio: ConOpciones }) {
  return (
    <View style={{ gap: espacio.m }}>
      {e.tipo === "caso_clinico" && (
        <View style={estilosTexto.caso}>
          <Text style={estilosTexto.etiquetaCaso}>Caso clínico</Text>
          <Text style={estilosTexto.textoCaso}>{e.caso}</Text>
        </View>
      )}
      <Text style={estilosTexto.enunciado} accessibilityRole="header">{e.tipo === "caso_clinico" ? e.pregunta : e.enunciado}</Text>
      <ListaOpciones opciones={e.opciones} correcta={e.correcta} {...props} />
    </View>
  );
}

/** Textos comunes de los ejercicios. */
export const estilosTexto = StyleSheet.create({
  caso: { backgroundColor: color.hueso, borderRadius: 16, padding: espacio.m, gap: espacio.xs },
  etiquetaCaso: { fontSize: 14, fontFamily: fuente.negrita, color: color.huesoTexto },
  textoCaso: { fontSize: 16, fontFamily: fuente.normal, color: color.texto, lineHeight: 23 },
  enunciado: { fontSize: 22, fontFamily: fuente.negrita, color: color.texto, lineHeight: 29 },
  ayuda: { fontSize: 15, fontFamily: fuente.media, color: color.tenue },
});
