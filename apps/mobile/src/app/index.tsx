import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useApp } from "../lib/estado";

export default function Entrada() {
  const { cargando, usuario } = useApp();
  if (cargando) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  return <Redirect href={usuario ? "/inicio" : "/bienvenida"} />;
}
