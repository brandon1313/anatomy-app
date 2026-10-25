import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { color, espacio, TOQUE_MINIMO } from "../tema";

export function Campo({ etiqueta, ayuda, ...props }: TextInputProps & { etiqueta: string; ayuda?: string }) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput accessibilityLabel={etiqueta} placeholderTextColor={color.tenue} style={estilos.entrada} {...props} />
      {ayuda && <Text style={estilos.ayuda}>{ayuda}</Text>}
    </View>
  );
}

const estilos = StyleSheet.create({
  campo: { gap: espacio.xs, marginBottom: espacio.m },
  etiqueta: { fontSize: 15, fontWeight: "600", color: color.texto },
  entrada: { minHeight: TOQUE_MINIMO + 4, borderWidth: 1, borderColor: color.borde, borderRadius: 10, paddingHorizontal: 12, fontSize: 17, backgroundColor: color.superficie, color: color.texto },
  ayuda: { fontSize: 13, color: color.tenue },
});
