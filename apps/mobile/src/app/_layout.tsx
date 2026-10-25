import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ProveedorApp } from "../lib/estado";
import { color } from "../tema";

export default function Layout() {
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
