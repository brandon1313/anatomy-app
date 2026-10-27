import type { Opcion } from "@anatomia/contenido";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { z } from "zod";
import { barajar } from "../leccion/flujo";
import { efecto } from "../lib/efectos";
import { color, espacio, fuente, TOQUE_MINIMO } from "../tema";
import type { PropsEjercicio } from "./tipos";

/**
 * Opciones barajadas. Tocar una solo la selecciona (en azul) y se puede cambiar; al comprobar se marca
 * la correcta en verde y, si falló, la elegida en rojo. `dosColumnas` las acomoda en cuadrícula.
 */
export function ListaOpciones({
  opciones: originales,
  correcta,
  comprobado,
  onElegir,
  dosColumnas,
}: PropsEjercicio & { opciones: z.infer<typeof Opcion>[]; correcta: string; dosColumnas?: boolean }) {
  const [opciones] = useState(() => barajar(originales));
  const [elegida, setElegida] = useState<string | null>(null);
  const textoCorrecta = originales.find((o) => o.id === correcta)?.texto;

  return (
    <View style={[{ gap: espacio.s }, dosColumnas && estilos.cuadricula]} accessibilityRole="radiogroup">
      {opciones.map((o) => {
        const esCorrecta = o.id === correcta;
        const marcada = o.id === elegida;
        const fallo = comprobado && marcada && !esCorrecta;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: marcada, disabled: comprobado }}
            accessibilityLabel={`${o.texto}${comprobado && esCorrecta ? ", respuesta correcta" : ""}${fallo ? ", tu respuesta, incorrecta" : ""}`}
            disabled={comprobado}
            onPress={() => {
              setElegida(o.id);
              efecto("elegir");
              onElegir({ correcto: esCorrecta, detalle: esCorrecta ? undefined : `Respuesta correcta: ${textoCorrecta}` });
            }}
            style={({ pressed }) => [
              estilos.opcion,
              dosColumnas && estilos.media,
              marcada && !comprobado && estilos.elegida,
              comprobado && esCorrecta && estilos.correcta,
              fallo && estilos.incorrecta,
              pressed && !comprobado && estilos.presionada,
            ]}
          >
            <Text
              style={[
                estilos.texto,
                dosColumnas && { fontSize: 16 },
                marcada && !comprobado && { color: color.acento },
                comprobado && esCorrecta && { color: color.verde },
                fallo && { color: color.rojo },
              ]}
            >
              {o.texto}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  cuadricula: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  opcion: { minHeight: TOQUE_MINIMO + 12, borderWidth: 2, borderBottomWidth: 4, borderColor: color.borde, borderRadius: 16, padding: espacio.m, justifyContent: "center", backgroundColor: color.superficie },
  media: { width: "48.5%", padding: espacio.s + 4 },
  elegida: { borderColor: color.acentoBorde, backgroundColor: color.acentoSuave },
  correcta: { borderColor: color.verdeBoton, backgroundColor: color.verdeSuave },
  incorrecta: { borderColor: color.rojoBoton, backgroundColor: color.rojoSuave },
  presionada: { borderBottomWidth: 2, marginTop: 2 },
  texto: { fontSize: 17, fontFamily: fuente.media, color: color.texto },
});
