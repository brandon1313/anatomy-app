import { Lexend_400Regular, Lexend_500Medium, Lexend_600SemiBold, Lexend_700Bold, useFonts } from "@expo-google-fonts/lexend";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { precargarSonidos } from "../lib/efectos";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ProveedorApp } from "../lib/estado";
import { color } from "../tema";

export default function Layout() {
  // Sin la fuente, el texto saltaría de la del sistema a Lexend: se espera a tenerla (es local, tarda poco).
  const [fuentes, errorFuentes] = useFonts({ Lexend_400Regular, Lexend_500Medium, Lexend_600SemiBold, Lexend_700Bold });
  useEffect(precargarSonidos, []);
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
