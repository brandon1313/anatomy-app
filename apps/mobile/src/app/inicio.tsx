import { router } from "expo-router";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Boton } from "../componentes/Boton";
import { useApp } from "../lib/estado";
import { uriImagen } from "../lib/imagenes";
import { programarRecordatorio } from "../lib/notificaciones";
import { ejerciciosDeLeccion, ejerciciosMostrables, estadoLeccion, lecciones } from "../leccion/flujo";
import { diaDeEstudio } from "../repaso/dia";
import { diasHastaElProximo, ejerciciosDeRepaso } from "../repaso/espaciado";
import { rachaVigente } from "../repaso/racha";
import { proximoRecordatorio } from "../repaso/recordatorio";
import { color, espacio, fuente } from "../tema";

const CIRCULO = {
  completada: { fondo: color.logro, sombra: color.logroSombra, icono: color.logroTexto },
  siguiente: { fondo: color.marca, sombra: color.marcaSombra, icono: "#fff" },
  bloqueada: { fondo: color.borde, sombra: "#cfd5da", icono: color.bloqueado },
};
/** Desplazamiento horizontal de cada lección: el camino zigzaguea. */
const ZIGZAG = [0, 56, 84, 56, 0, -56, -84, -56];
const TAM = 76;

export default function Inicio() {
  const { usuario, paquete, descarga, actualizar, completadas, salir, progreso, racha, horaRecordatorio } = useApp();

  if (!paquete) {
    return (
      <SafeAreaView style={estilos.centro}>
        {descarga === "descargando" ? (
          <>
            <ActivityIndicator size="large" color={color.marca} />
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
  const ahora = new Date();
  // Fichas vencidas que tienen un ejercicio para mostrar (la sesión toma hasta 10).
  const porRepasar = ejerciciosDeRepaso(progreso, ejerciciosMostrables(paquete, (a) => uriImagen(a) !== null), ahora, Infinity).length;
  const proximo = diasHastaElProximo(progreso, ahora);
  const hoy = diaDeEstudio(ahora);
  const dias = rachaVigente(racha, hoy);
  // Encendida si hoy ya cuenta; apagada si todavía falta la lección o el repaso de hoy.
  const encendida = racha.ultimoDia === hoy;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={estilos.contenido}>
        <View style={estilos.cabecera}>
          <Text style={estilos.saludo} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            Hola, {usuario?.nombre.split(" ")[0]}
          </Text>
          <View
            style={[estilos.racha, encendida && estilos.rachaEncendida]}
            accessible
            accessibilityLabel={`Racha de ${dias} ${dias === 1 ? "día" : "días"}${dias > 0 && !encendida ? ". Completa una lección o un repaso hoy para no perderla" : ""}`}
          >
            <Text style={[estilos.rachaIcono, !encendida && { opacity: 0.45 }]}>🔥</Text>
            <Text style={[estilos.rachaTexto, encendida && { color: color.logroTexto }]}>{dias}</Text>
          </View>
        </View>
        {descarga === "sin_conexion" && <Text style={estilos.offline}>Sin conexión: usando las lecciones guardadas.</Text>}
        <View style={[estilos.repaso, porRepasar > 0 && { borderColor: color.coral }]}>
          <View style={{ flex: 1 }}>
            <Text style={[estilos.repasoTitulo, porRepasar > 0 && { color: color.coralTexto }]}>Repaso</Text>
            <Text style={estilos.repasoDetalle}>
              {progreso.length === 0
                ? "Completa una lección para empezar a repasar."
                : porRepasar > 0
                  ? `${porRepasar} ${porRepasar === 1 ? "ficha" : "fichas"} por repasar`
                  : proximo === null
                    ? "Al día."
                    : `Al día. Vuelve ${proximo === 1 ? "mañana" : `en ${proximo} días`}.`}
            </Text>
          </View>
          {porRepasar > 0 && <Boton titulo="Repasar" onPress={() => router.push({ pathname: "/leccion/[id]", params: { id: "repaso" } })} />}
        </View>
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
                      <Text style={[estilos.icono, { color: c.icono }]}>
                        {estado === "completada" ? "✓" : estado === "bloqueada" ? "🔒" : "★"}
                      </Text>
                    </View>
                  )}
                </Pressable>
                {estado === "siguiente" && <Text style={estilos.empezar}>Empezar</Text>}
                <Text style={[estilos.tituloLeccion, estado === "bloqueada" && { color: color.bloqueado }]} numberOfLines={2}>
                  {l.titulo}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Pruebas solo en desarrollo y en el teléfono: el visor 3D (docs/PLAN-REDISENO.md) y el recordatorio,
            que suena en 10 s con el texto de hoy si la app queda en segundo plano; al volver se reprograma el real. */}
        {__DEV__ && Platform.OS !== "web" && (
          <View style={{ marginTop: espacio.xl, gap: espacio.m }}>
            <Boton titulo="Prueba del visor 3D" variante="secundario" onPress={() => router.push("/prueba-3d")} />
            <Boton
              titulo="Probar recordatorio en 10 s"
              variante="secundario"
              onPress={() => {
                const r = proximoRecordatorio(horaRecordatorio ?? "20:00", racha, ahora);
                if (r) void programarRecordatorio({ ...r, cuando: new Date(Date.now() + 10_000) });
              }}
            />
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
  cabecera: { flexDirection: "row", alignItems: "center", gap: espacio.m },
  saludo: { flex: 1, fontSize: 28, fontFamily: fuente.titulo, color: color.texto },
  racha: { flexDirection: "row", alignItems: "center", gap: espacio.xs, paddingHorizontal: espacio.m, paddingVertical: espacio.xs, borderRadius: 999, borderWidth: 2, borderColor: color.borde, backgroundColor: color.superficie },
  rachaEncendida: { borderColor: color.logro, backgroundColor: color.hueso },
  rachaIcono: { fontSize: 18 },
  rachaTexto: { fontSize: 18, fontFamily: fuente.titulo, color: color.tenue },
  offline: { marginTop: espacio.s, color: color.tenue, fontSize: 14, fontFamily: fuente.normal },
  repaso: { marginTop: espacio.l, flexDirection: "row", alignItems: "center", gap: espacio.m, padding: espacio.m, borderRadius: 16, borderWidth: 2, borderBottomWidth: 4, borderColor: color.borde, backgroundColor: color.superficie },
  repasoTitulo: { fontSize: 18, fontFamily: fuente.titulo, color: color.texto },
  repasoDetalle: { marginTop: 2, fontSize: 14, fontFamily: fuente.normal, color: color.tenue },
  unidad: { marginTop: espacio.l, marginBottom: espacio.l, padding: espacio.m, borderRadius: 16, backgroundColor: color.marca, borderBottomWidth: 4, borderColor: color.marcaSombra },
  unidadEtiqueta: { color: "#d5f2ee", fontSize: 14, fontFamily: fuente.media },
  unidadTitulo: { color: "#fff", fontSize: 20, fontFamily: fuente.titulo },
  ruta: { alignItems: "center", gap: espacio.l },
  parada: { alignItems: "center", width: 180 },
  circulo: { width: TAM, height: TAM, borderRadius: TAM / 2, borderBottomWidth: 6, alignItems: "center", justifyContent: "center" },
  hundido: { borderBottomWidth: 0, marginTop: 6 },
  icono: { color: "#fff", fontSize: 30, fontFamily: fuente.titulo },
  empezar: { marginTop: espacio.xs, fontSize: 14, fontFamily: fuente.titulo, color: color.marcaTexto },
  tituloLeccion: { marginTop: espacio.xs, fontSize: 15, fontFamily: fuente.negrita, color: color.texto, textAlign: "center" },
});
