import { StyleSheet, Text, View } from "react-native";
import { color } from "../tema";

/** De 0 a 3 estrellas: las ganadas en color de logro, las que faltan en gris. */
export function Estrellas({ cuantas, tam = 18 }: { cuantas: number; tam?: number }) {
  return (
    <View style={estilos.fila} accessible accessibilityLabel={`${cuantas} de 3 estrellas`}>
      {[0, 1, 2].map((i) => (
        <Text key={i} style={{ fontSize: tam, lineHeight: tam * 1.2, color: i < cuantas ? color.logro : color.borde }}>
          ★
        </Text>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: "row", justifyContent: "center", gap: 2 },
});
