import type { Imagen } from "@anatomia/contenido";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, type ScrollViewInstance, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, Mask, Polygon, Rect } from "react-native-svg";
import { desplazamientoPara, normalizar, puntosEnPantalla } from "../leccion/imagen";
import { uriImagen } from "../lib/imagenes";
import { color, espacio } from "../tema";
import { posicionDelToque } from "./posicion";

/** Dónde tocó el estudiante (0–1) y si acertó. */
export interface Marca {
  punto: [number, number];
  acierto: boolean;
}

/**
 * Imagen a todo el ancho y con su proporción, dentro de una ventana que se desliza si la imagen es
 * más alta. Sobre ella, con react-native-svg, la zona resaltada: se rellena solo su parte visible (las
 * zonas dibujadas después la tapan) y su contorno completo va punteado.
 */
export function ImagenConZonas({
  imagen,
  altoVentana,
  resaltada,
  tono = "pregunta",
  marca,
  enfocar,
  onToque,
}: {
  imagen: Imagen;
  altoVentana: number;
  resaltada?: string;
  /** "pregunta": la zona que se pregunta; "correcta": la respuesta, en verde. */
  tono?: "pregunta" | "correcta";
  marca?: Marca;
  /** Zona que se centra en la ventana. */
  enfocar?: string;
  onToque?: (punto: [number, number]) => void;
}) {
  const [ancho, setAncho] = useState(0);
  const scroll = useRef<ScrollViewInstance>(null);
  const alto = (ancho * imagen.alto) / imagen.ancho;
  const ventana = ancho > 0 ? Math.min(alto, altoVentana) : altoVentana;
  const uri = uriImagen(imagen.archivo);

  useEffect(() => {
    const zona = imagen.zonas.find((z) => z.id === enfocar);
    // Si hay una marca, se intenta que se vean la zona y el punto tocado a la vez.
    if (zona && alto > 0) scroll.current?.scrollTo({ y: desplazamientoPara(zona, alto, ventana, marca?.punto[1]), animated: true });
  }, [enfocar, alto, ventana, imagen, marca]);

  const k = imagen.zonas.findIndex((z) => z.id === resaltada);
  const zona = k >= 0 ? imagen.zonas[k] : undefined;
  const relleno = tono === "correcta" ? color.zonaCorrecta : color.acento;
  const borde = tono === "correcta" ? color.verde : color.acento;
  const mascara = `visible-${imagen.id}`;

  return (
    <View style={[estilos.marco, { height: ventana }]} onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
      {!uri && <Text style={estilos.falta}>La imagen no está descargada. Conéctate para descargarla.</Text>}
      {uri && ancho > 0 && (
        <ScrollView ref={scroll} nestedScrollEnabled style={{ height: ventana }}>
          <Pressable
            disabled={!onToque}
            accessibilityRole={onToque ? "button" : "image"}
            accessibilityLabel={imagen.titulo}
            onPress={(e) => onToque?.(normalizar(...posicionDelToque(e), ancho, alto))}
            style={{ width: ancho, height: alto }}
          >
            {/* El toque lo recibe siempre el Pressable: así la posición es relativa a la imagen completa. */}
            <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
              <Image source={{ uri }} style={{ width: ancho, height: alto }} resizeMode="stretch" />
              {zona && (
                <Svg width={ancho} height={alto} style={StyleSheet.absoluteFill}>
                  <Defs>
                    <Mask id={mascara} maskUnits="userSpaceOnUse" x={0} y={0} width={ancho} height={alto}>
                      <Rect x={0} y={0} width={ancho} height={alto} fill="black" />
                      <Polygon points={puntosEnPantalla(zona, ancho, alto)} fill="white" />
                      {imagen.zonas.slice(k + 1).map((z) => (
                        <Polygon key={z.id} points={puntosEnPantalla(z, ancho, alto)} fill="black" />
                      ))}
                    </Mask>
                  </Defs>
                  <Polygon points={puntosEnPantalla(zona, ancho, alto)} fill={relleno} fillOpacity={0.5} mask={`url(#${mascara})`} />
                  <Polygon points={puntosEnPantalla(zona, ancho, alto)} fill="none" stroke={borde} strokeWidth={2} strokeDasharray="6 4" />
                </Svg>
              )}
              {marca && (
                <View
                  style={[
                    estilos.marca,
                    { left: marca.punto[0] * ancho - 11, top: marca.punto[1] * alto - 11, backgroundColor: marca.acierto ? color.verde : color.ambar },
                  ]}
                />
              )}
            </View>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  marco: { borderRadius: 12, overflow: "hidden", backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde },
  falta: { padding: espacio.m, color: color.tenue, textAlign: "center" },
  marca: { position: "absolute", width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: "#fff" },
});
