import { router } from "expo-router";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Boton } from "../componentes/Boton";
import { useApp } from "../lib/estado";
import { uriImagen } from "../lib/imagenes";
import { ejerciciosDeLeccion, estadoLeccion, lecciones } from "../leccion/flujo";
import { color, espacio, fuente } from "../tema";

const CIRCULO = {
  completada: { fondo: color.oro, sombra: "#e0a800" },
  siguiente: { fondo: color.verdeBoton, sombra: color.verdeSombra },
  bloqueada: { fondo: color.borde, sombra: "#cfcfcf" },
};
/** Desplazamiento horizontal de cada lección: el camino zigzaguea. */
const ZIGZAG = [0, 56, 84, 56, 0, -56, -84, -56];
const TAM = 76;

export default function Inicio() {
  const { usuario, paquete, descarga, actualizar, completadas, salir } = useApp();

  if (!paquete) {
    return (
      <SafeAreaView style={estilos.centro}>
        {descarga === "descargando" ? (
          <>
            <ActivityIndicator size="large" color={color.verdeBoton} />
            <Text style={estilos.aviso}>Descargando las lecciones…</Text>
          </>
        ) : (
          <>
            <Text style={estilos.aviso}>
              {descarga === "sin_conexion"
                ? "Conéctate a internet para descargar las lecciones. Después funcionan sin conexión."
                : descarga === "error"
                  ? "No pudimos descargar las lecciones."
                  : "Todavía no hay lecciones publicadas."}
            </Text>
            <Boton titulo="Reintentar" onPress={actualizar} />
          </>
        )}
      </SafeAreaView>
    );
  }

  const todas = lecciones(paquete);
  const unidad = paquete.curso.unidades[0];
  // Lecciones con ejercicios en 3D (tienen presentación): su imagen trae modelo y ya está en el teléfono.
  const imagenes = new Map(paquete.imagenes.map((img) => [img.id, img]));
  const ejercicios = new Map(paquete.ejercicios.map((e) => [e.id, e]));
  const con3D = (ids: string[]) =>
    Platform.OS !== "web" &&
    ids.some((id) => {
      const e = ejercicios.get(id);
      const m = e && "imagenId" in e ? imagenes.get(e.imagenId)?.modelo3d : undefined;
      return !!m && uriImagen(m.archivo) !== null && uriImagen(m.datos) !== null;
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={estilos.contenido}>
        <Text style={estilos.saludo}>Hola, {usuario?.nombre.split(" ")[0]}</Text>
        {descarga === "sin_conexion" && <Text style={estilos.offline}>Sin conexión: usando las lecciones guardadas.</Text>}
        <View style={estilos.unidad}>
          <Text style={estilos.unidadEtiqueta}>Unidad 1</Text>
          <Text style={estilos.unidadTitulo} accessibilityRole="header">{unidad?.titulo}</Text>
        </View>

        <View style={estilos.ruta}>
          {todas.map((l, i) => {
            const estado = estadoLeccion(todas, i, completadas);
            const n = ejerciciosDeLeccion(paquete, l, (archivo) => uriImagen(archivo) !== null).length;
            const c = CIRCULO[estado];
            return (
              <View key={l.id} style={[estilos.parada, { transform: [{ translateX: ZIGZAG[i % ZIGZAG.length] }] }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: estado === "bloqueada" }}
                  accessibilityLabel={`Lección ${i + 1}: ${l.titulo}. ${estado === "completada" ? "Completada" : estado === "bloqueada" ? "Bloqueada" : "Siguiente"}. ${n} ejercicios`}
                  disabled={estado === "bloqueada" || n === 0}
                  onPress={() => router.push({ pathname: "/leccion/[id]", params: { id: l.id } })}
                >
                  {({ pressed }) => (
                    <View style={[estilos.circulo, { backgroundColor: c.fondo, borderColor: c.sombra }, pressed && estilos.hundido]}>
                      <Text style={[estilos.icono, estado === "bloqueada" && { color: color.bloqueado }]}>
                        {estado === "completada" ? "✓" : estado === "bloqueada" ? "🔒" : "★"}
                      </Text>
                    </View>
                  )}
                </Pressable>
                {estado === "siguiente" && <Text style={estilos.empezar}>EMPEZAR</Text>}
                <Text style={[estilos.tituloLeccion, estado === "bloqueada" && { color: color.bloqueado }]} numberOfLines={2}>
                  {l.titulo}
                </Text>
                {estado !== "bloqueada" && n > 0 && con3D(l.ejercicioIds) && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Ver la presentación de ${l.titulo}`}
                    onPress={() => router.push({ pathname: "/leccion/[id]", params: { id: l.id, presentacion: "1" } })}
                    style={({ pressed }) => [estilos.verPresentacion, pressed && { opacity: 0.7 }]}
                    hitSlop={6}
                  >
                    <Text style={estilos.verPresentacionTexto}>▶ Ver presentación</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        {/* Prueba técnica del visor 3D (docs/PLAN-REDISENO.md): solo en desarrollo y en el teléfono. */}
        {__DEV__ && Platform.OS !== "web" && (
          <View style={{ marginTop: espacio.xl }}>
            <Boton titulo="Prueba del visor 3D" variante="secundario" onPress={() => router.push("/prueba-3d")} />
          </View>
        )}

        <View style={{ marginTop: espacio.xl }}>
          <Boton titulo="Cerrar sesión" variante="secundario" onPress={async () => { await salir(); router.replace("/bienvenida"); }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, justifyContent: "center", alignItems: "stretch", padding: espacio.l, gap: espacio.m, backgroundColor: color.fondo },
  aviso: { fontSize: 17, fontFamily: fuente.media, color: color.tenue, textAlign: "center" },
  contenido: { padding: espacio.l, paddingBottom: espacio.xl },
  saludo: { fontSize: 28, fontFamily: fuente.titulo, color: color.texto },
  offline: { marginTop: espacio.s, color: color.tenue, fontSize: 14, fontFamily: fuente.normal },
  unidad: { marginTop: espacio.l, marginBottom: espacio.l, padding: espacio.m, borderRadius: 16, backgroundColor: color.verdeBoton, borderBottomWidth: 4, borderColor: color.verdeSombra },
  unidadEtiqueta: { color: "#eaffd9", fontSize: 14, fontFamily: fuente.negrita, textTransform: "uppercase", letterSpacing: 0.6 },
  unidadTitulo: { color: "#fff", fontSize: 20, fontFamily: fuente.titulo },
  ruta: { alignItems: "center", gap: espacio.l },
  parada: { alignItems: "center", width: 180 },
  circulo: { width: TAM, height: TAM, borderRadius: TAM / 2, borderBottomWidth: 6, alignItems: "center", justifyContent: "center" },
  hundido: { borderBottomWidth: 0, marginTop: 6 },
  icono: { color: "#fff", fontSize: 30, fontFamily: fuente.titulo },
  empezar: { marginTop: espacio.xs, fontSize: 13, fontFamily: fuente.titulo, color: color.verde, letterSpacing: 0.8 },
  verPresentacion: { marginTop: espacio.xs, minHeight: 36, paddingHorizontal: espacio.m, borderRadius: 18, borderWidth: 2, borderColor: color.acentoBorde, backgroundColor: color.acentoSuave, justifyContent: "center" },
  verPresentacionTexto: { fontSize: 14, fontFamily: fuente.negrita, color: color.acento },
  tituloLeccion: { marginTop: espacio.xs, fontSize: 15, fontFamily: fuente.negrita, color: color.texto, textAlign: "center" },
});
