import { type Ejercicio, esToqueCorrecto, type Imagen, zonaTocada } from "@anatomia/contenido";
import { useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import { efecto } from "../lib/efectos";
import { espacio } from "../tema";
import { ImagenConZonas } from "./ImagenConZonas";
import { estilosTexto } from "./OpcionMultiple";
import type { PropsEjercicio } from "./tipos";

type TTocar = Extract<Ejercicio, { tipo: "tocar_estructura" }>;

/**
 * "Toca el recto femoral." Tocar selecciona el músculo entero (la zona se pinta de azul) y se puede
 * cambiar. Al comprobar califica con la regla del toque (esToqueCorrecto): la correcta queda en verde y
 * se marca dónde tocó; si falló, la ventana se desplaza hasta la correcta.
 */
export function TocarEstructura({
  ejercicio: e,
  imagen,
  nombres,
  comprobado,
  onElegir,
}: PropsEjercicio & {
  ejercicio: TTocar;
  imagen: Imagen;
  /** fichaId → nombre, para decir qué tocó si se equivocó. */
  nombres: Map<string, string>;
}) {
  const { height } = useWindowDimensions();
  const [toque, setToque] = useState<{ punto: [number, number]; zona: string } | null>(null);

  function tocar(punto: [number, number]) {
    const acierto = esToqueCorrecto(punto, e.zonaCorrecta, imagen.zonas);
    // Junto al borde de la correcta (dentro de la tolerancia) cuenta como la correcta.
    const zona = zonaTocada(punto, imagen.zonas) ?? (acierto ? imagen.zonas.find((z) => z.id === e.zonaCorrecta) : undefined);
    if (!zona) {
      setToque(null);
      return onElegir(null);
    }
    setToque({ punto, zona: zona.id });
    efecto("elegir");
    const nombre = nombres.get(zona.fichaId) ?? zona.fichaId;
    onElegir({ correcto: acierto, detalle: acierto ? undefined : `Tocaste el ${nombre.toLowerCase()}. El correcto está en verde.` });
  }

  return (
    <View style={{ gap: espacio.s }}>
      <Text style={estilosTexto.enunciado} accessibilityRole="header">{e.enunciado}</Text>
      <Text style={estilosTexto.ayuda}>Toca el músculo en el dibujo y luego comprueba. Puedes deslizarlo.</Text>
      <ImagenConZonas
        imagen={imagen}
        altoVentana={Math.round(height * 0.5)}
        resaltada={comprobado ? e.zonaCorrecta : toque?.zona}
        tono={comprobado ? "correcta" : "pregunta"}
        marca={comprobado && toque ? { punto: toque.punto, acierto: toque.zona === e.zonaCorrecta } : undefined}
        enfocar={comprobado && toque?.zona !== e.zonaCorrecta ? e.zonaCorrecta : undefined}
        onToque={comprobado ? undefined : tocar}
      />
    </View>
  );
}
