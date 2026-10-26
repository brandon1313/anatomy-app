import type { Opcion } from "@anatomia/contenido";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { z } from "zod";
import { barajar } from "../leccion/flujo";
import { color, espacio, TOQUE_MINIMO } from "../tema";

/** Opciones barajadas; al elegir una se marcan la correcta y, si falló, la elegida. */
export function ListaOpciones({
  opciones: originales,
  correcta,
  onResponder,
}: {
  opciones: z.infer<typeof Opcion>[];
  correcta: string;
  onResponder: (correcto: boolean) => void;
}) {
  const [opciones] = useState(() => barajar(originales));
  const [elegida, setElegida] = useState<string | null>(null);
  const respondido = elegida !== null;

  return (
    <View style={{ gap: espacio.s }} accessibilityRole="radiogroup">
      {opciones.map((o) => {
        const esCorrecta = o.id === correcta;
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
            <Text style={estilos.texto}>{o.texto}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  opcion: { minHeight: TOQUE_MINIMO + 12, borderWidth: 2, borderColor: color.borde, borderRadius: 12, padding: espacio.m, justifyContent: "center", backgroundColor: color.superficie },
  correcta: { borderColor: color.verde, backgroundColor: color.verdeSuave },
  incorrecta: { borderColor: color.rojo, backgroundColor: color.rojoSuave },
  texto: { fontSize: 17, color: color.texto },
});
