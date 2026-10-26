import type { Ejercicio, Imagen } from "@anatomia/contenido";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { color, espacio } from "../tema";
import { ImagenConZonas } from "./ImagenConZonas";
import { ListaOpciones } from "./ListaOpciones";

type TIdentificar = Extract<Ejercicio, { tipo: "identificar_imagen" }>;

/** "¿Qué músculo está resaltado?" La zona se resalta y la ventana se centra en ella. */
export function IdentificarImagen({
  ejercicio: e,
  imagen,
  onResponder,
}: {
  ejercicio: TIdentificar;
  imagen: Imagen;
  onResponder: (correcto: boolean) => void;
}) {
  const { height } = useWindowDimensions();
  return (
    <View style={{ gap: espacio.m }}>
      <Text style={estilos.enunciado} accessibilityRole="header">¿Qué músculo está resaltado?</Text>
      <ImagenConZonas imagen={imagen} altoVentana={Math.round(height * 0.42)} resaltada={e.zonaResaltada} enfocar={e.zonaResaltada} />
      <ListaOpciones opciones={e.opciones} correcta={e.correcta} onResponder={onResponder} />
    </View>
  );
}

const estilos = StyleSheet.create({
  enunciado: { fontSize: 20, fontWeight: "700", color: color.texto, lineHeight: 27 },
});
