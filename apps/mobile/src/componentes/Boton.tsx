import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { color, espacio, TOQUE_MINIMO } from "../tema";

export function Boton(props: {
  titulo: string;
  onPress: () => void;
  variante?: "principal" | "secundario" | "exito" | "error";
  deshabilitado?: boolean;
  cargando?: boolean;
}) {
  const v = props.variante ?? "principal";
  const inactivo = props.deshabilitado || props.cargando;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.titulo}
      accessibilityState={{ disabled: !!inactivo, busy: !!props.cargando }}
      disabled={inactivo}
      onPress={props.onPress}
      style={({ pressed }) => [estilos.base, estilos[v], inactivo && estilos.inactivo, pressed && estilos.presionado]}
    >
      {props.cargando ? (
        <ActivityIndicator color={v === "secundario" ? color.texto : "#fff"} />
      ) : (
        <Text style={[estilos.texto, v === "secundario" && { color: color.texto }]}>{props.titulo}</Text>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: { minHeight: TOQUE_MINIMO + 8, borderRadius: 12, paddingHorizontal: espacio.m, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  principal: { backgroundColor: color.acento, borderColor: color.acento },
  secundario: { backgroundColor: color.superficie, borderColor: color.borde },
  exito: { backgroundColor: color.verde, borderColor: color.verde },
  error: { backgroundColor: color.rojo, borderColor: color.rojo },
  inactivo: { opacity: 0.45 },
  presionado: { opacity: 0.8 },
  texto: { color: "#fff", fontSize: 17, fontWeight: "600" },
});
