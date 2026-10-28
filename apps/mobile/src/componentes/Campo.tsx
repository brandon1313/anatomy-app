import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { color, espacio, fuente, TOQUE_MINIMO } from "../tema";

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
  etiqueta: { fontSize: 15, fontFamily: fuente.negrita, color: color.texto },
  entrada: { minHeight: TOQUE_MINIMO + 4, borderWidth: 2, borderColor: color.borde, borderRadius: 12, paddingHorizontal: 12, fontSize: 17, fontFamily: fuente.normal, backgroundColor: color.superficie, color: color.texto },
  ayuda: { fontSize: 13, fontFamily: fuente.normal, color: color.tenue },
});
