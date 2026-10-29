import { type LayoutRectangle, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";
import { Boton } from "../componentes/Boton";
import { efecto } from "../lib/efectos";
import { color, espacio, fuente } from "../tema";
import type { ControlEscena } from "../visor3d/EscenaLeccion";
import { estilosTexto } from "./OpcionMultiple";

/** Un color por músculo, distinto del verde y el rojo de las respuestas. */
const COLORES = ["#6a5cff", "#00bfa8", "#ffb41f", "#ec4899", "#0ea5e9", "#8b5cf6", "#7aa800", "#f05a12"];
const MS_POR_MUSCULO = 1800;

export interface MusculoPresentado {
  /** Id en el modelo. */
  estructura: string;
  nombre: string;
}

/**
 * Tráiler de la lección: antes del primer ejercicio, el modelo gira solo y muestra uno por uno los
 * músculos que se van a practicar, cada uno con su color y su nombre. Al final quedan todos pintados.
 * Usa la misma escena de la lección (se arma con el modelo, no es un video): sirve sin internet y para
 * cualquier lección nueva.
 */
export function Presentacion3D({
  musculos,
  ocultas,
  escena,
  escenaLista,
  onHueco,
  onTerminar,
}: {
  musculos: MusculoPresentado[];
  ocultas: string[];
  escena: ControlEscena;
  /** Mayor que 0 cuando el modelo ya cargó: hasta entonces la presentación espera. */
  escenaLista: number;
  onHueco: (hueco: LayoutRectangle) => void;
  onTerminar: () => void;
}) {
  /** -1: esperando el modelo; 0…n-1: un músculo; n: todos juntos. */
  const [paso, setPaso] = useState(-1);
  const n = musculos.length;

  useEffect(() => {
    if (escenaLista === 0 || paso !== -1) return;
    escena.enviar({ tipo: "ocultar", ids: ocultas });
    escena.enviar({ tipo: "girar", activo: true });
    setPaso(0);
  }, [escenaLista, paso, escena, ocultas]);

  useEffect(() => {
    if (paso < 0) return;
    if (paso >= n) {
      escena.enviar({ tipo: "pintar", marcas: Object.fromEntries(musculos.map((m, i) => [m.estructura, COLORES[i % COLORES.length]])), tinte: 0.6 });
      escena.enviar({ tipo: "vista", vista: "ant" });
      efecto("fin");
      return;
    }
    const m = musculos[paso];
    escena.enviar({ tipo: "pintar", marcas: { [m.estructura]: COLORES[paso % COLORES.length] }, aislar: true });
    escena.enviar({ tipo: "enfocar", id: m.estructura });
    efecto("paso");
    const t = setTimeout(() => setPaso(paso + 1), MS_POR_MUSCULO);
    return () => clearTimeout(t);
  }, [paso, n, musculos, escena]);

  // Al salir (terminó o se saltó), el modelo deja de girar y queda limpio para el primer ejercicio.
  useEffect(
    () => () => {
      escena.enviar({ tipo: "girar", activo: false });
      escena.enviar({ tipo: "pintar", marcas: {} });
    },
    [escena],
  );

  const actual = paso >= 0 && paso < n ? musculos[paso] : null;
  const colorActual = COLORES[Math.max(paso, 0) % COLORES.length];

  return (
    <View style={estilos.raiz}>
      <Text style={estilos.etiqueta}>En esta lección</Text>
      <Text style={estilosTexto.enunciado} accessibilityRole="header">
        {paso >= n ? `Vas a practicar ${n} músculos` : "Conoce los músculos que vas a practicar"}
      </Text>
      <View style={estilos.hueco} onLayout={(ev) => onHueco(ev.nativeEvent.layout)} />
      <View style={estilos.nombreFila} accessibilityLiveRegion="polite">
        {actual ? (
          <>
            <View style={[estilos.punto, { backgroundColor: colorActual }]} />
            <Text style={[estilos.nombre, { color: colorActual }]}>{actual.nombre}</Text>
          </>
        ) : paso >= n ? (
          <Text style={estilos.listo}>¡Listo! Ahora a practicar.</Text>
        ) : (
          <Text style={estilos.listo}>Preparando el modelo…</Text>
        )}
      </View>
      <View style={estilos.puntos} accessibilityElementsHidden>
        {musculos.map((m, i) => (
          <View key={m.estructura} style={[estilos.progreso, i <= paso && { backgroundColor: COLORES[i % COLORES.length] }]} />
        ))}
      </View>
      <Boton titulo={paso >= n ? "Empezar" : "Saltar"} variante={paso >= n ? "principal" : "secundario"} onPress={onTerminar} />
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, paddingHorizontal: espacio.m, paddingTop: espacio.s, paddingBottom: espacio.m, gap: espacio.s },
  etiqueta: { fontSize: 14, fontFamily: fuente.negrita, color: color.marcaTexto },
  hueco: { flex: 1, minHeight: 240 },
  nombreFila: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: espacio.s, minHeight: 40 },
  punto: { width: 16, height: 16, borderRadius: 8 },
  nombre: { fontSize: 28, fontFamily: fuente.titulo },
  listo: { fontSize: 20, fontFamily: fuente.negrita, color: color.texto },
  puntos: { flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: espacio.xs },
  progreso: { width: 18, height: 6, borderRadius: 3, backgroundColor: color.borde },
});
