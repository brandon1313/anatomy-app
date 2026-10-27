import type { Ejercicio, Imagen } from "@anatomia/contenido";
import { Text, useWindowDimensions, View } from "react-native";
import { espacio } from "../tema";
import { ImagenConZonas } from "./ImagenConZonas";
import { ListaOpciones } from "./ListaOpciones";
import { estilosTexto } from "./OpcionMultiple";
import type { PropsEjercicio } from "./tipos";

type TIdentificar = Extract<Ejercicio, { tipo: "identificar_imagen" }>;

/** "¿Qué músculo está resaltado?" La zona se resalta y la ventana se centra en ella. */
export function IdentificarImagen({ ejercicio: e, imagen, ...props }: PropsEjercicio & { ejercicio: TIdentificar; imagen: Imagen }) {
  const { height } = useWindowDimensions();
  return (
    <View style={{ gap: espacio.m }}>
      <Text style={estilosTexto.enunciado} accessibilityRole="header">¿Qué músculo está resaltado?</Text>
      <ImagenConZonas
        imagen={imagen}
        altoVentana={Math.round(height * 0.38)}
        resaltada={e.zonaResaltada}
        tono={props.comprobado ? "correcta" : "pregunta"}
        enfocar={e.zonaResaltada}
      />
      <ListaOpciones opciones={e.opciones} correcta={e.correcta} dosColumnas {...props} />
    </View>
  );
}
