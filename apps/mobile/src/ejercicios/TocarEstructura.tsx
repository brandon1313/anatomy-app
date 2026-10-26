import { type Ejercicio, esToqueCorrecto, type Imagen, zonaTocada } from "@anatomia/contenido";
import { useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { color, espacio } from "../tema";
import { ImagenConZonas, type Marca } from "./ImagenConZonas";

type TTocar = Extract<Ejercicio, { tipo: "tocar_estructura" }>;

/**
 * "Toca el recto femoral." Califica con la regla del toque (esToqueCorrecto). Al responder se resalta
 * en verde la zona correcta y se marca dónde tocó; si falló, la ventana se desplaza hasta la correcta.
 */
export function TocarEstructura({
  ejercicio: e,
  imagen,
  nombres,
  onResponder,
}: {
  ejercicio: TTocar;
  imagen: Imagen;
  /** fichaId → nombre, para decir qué tocó si se equivocó. */
  nombres: Map<string, string>;
  onResponder: (correcto: boolean, detalle?: string) => void;
}) {
  const { height } = useWindowDimensions();
  const [marca, setMarca] = useState<Marca | null>(null);

  function tocar(punto: [number, number]) {
    const acierto = esToqueCorrecto(punto, e.zonaCorrecta, imagen.zonas);
    setMarca({ punto, acierto });
    if (acierto) return onResponder(true);
    const tocada = zonaTocada(punto, imagen.zonas);
    const nombre = tocada && (nombres.get(tocada.fichaId) ?? tocada.fichaId);
    onResponder(false, nombre ? `Tocaste el ${nombre.toLowerCase()}.` : "Tocaste fuera de los músculos.");
  }

  return (
    <View style={{ gap: espacio.s }}>
      <Text style={estilos.enunciado} accessibilityRole="header">{e.enunciado}</Text>
      <Text style={estilos.ayuda}>{marca ? " " : "Toca el músculo en el dibujo. Puedes deslizarlo."}</Text>
      <ImagenConZonas
        imagen={imagen}
        altoVentana={Math.round(height * 0.55)}
        resaltada={marca ? e.zonaCorrecta : undefined}
        tono="correcta"
        marca={marca ?? undefined}
        enfocar={marca && !marca.acierto ? e.zonaCorrecta : undefined}
        onToque={marca ? undefined : tocar}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  enunciado: { fontSize: 20, fontWeight: "700", color: color.texto, lineHeight: 27 },
  ayuda: { fontSize: 15, color: color.tenue },
});
