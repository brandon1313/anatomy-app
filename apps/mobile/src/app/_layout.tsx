import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black, useFonts } from "@expo-google-fonts/nunito";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ProveedorApp } from "../lib/estado";
import { color } from "../tema";

export default function Layout() {
  // Sin la fuente, el texto saltaría de la del sistema a Nunito: se espera a tenerla (es local, tarda poco).
  const [fuentes, errorFuentes] = useFonts({ Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black });
  if (!fuentes && !errorFuentes) return null;
  return (
    <SafeAreaProvider>
      <ProveedorApp>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.fondo } }}>
          <Stack.Screen name="leccion/[id]" options={{ gestureEnabled: false }} />
        </Stack>
      </ProveedorApp>
    </SafeAreaProvider>
  );
}
