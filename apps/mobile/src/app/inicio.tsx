import { estrellas } from "@anatomia/contenido";
import { router } from "expo-router";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Boton } from "../componentes/Boton";
import { Estrellas } from "../componentes/Estrellas";
import { Icono } from "../componentes/Icono";
import { useApp } from "../lib/estado";
import { uriImagen } from "../lib/imagenes";
import { programarRecordatorio } from "../lib/notificaciones";
import { ejerciciosDeLeccion, ejerciciosMostrables, estadoLeccion, lecciones, unidadesConLecciones } from "../leccion/flujo";
import { diaDeEstudio } from "../repaso/dia";
import { diasHastaElProximo, ejerciciosDeRepaso } from "../repaso/espaciado";
import { rachaVigente } from "../repaso/racha";
import { proximoRecordatorio } from "../repaso/recordatorio";
import { color, espacio, fuente, TOQUE_MINIMO } from "../tema";

const CIRCULO = {
  completada: { fondo: color.logro, sombra: color.logroSombra, icono: "#fff" },
  siguiente: { fondo: color.marca, sombra: color.marcaSombra, icono: "#fff" },
  bloqueada: { fondo: color.borde, sombra: "#cfd5da", icono: color.bloqueado },
};
/** Desplazamiento horizontal de cada lección: el camino zigzaguea. */
const ZIGZAG = [0, 56, 84, 56, 0, -56, -84, -56];
const TAM = 76;

export default function Inicio() {
  const { usuario, paquete, descarga, actualizar, completadas, marcas, progreso, racha, horaRecordatorio } = useApp();

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
        {/* Arriba la racha y el perfil; el saludo debajo, a todo el ancho, para que ningún nombre se corte. */}
        <View style={estilos.cabecera}>
          <View
            style={[estilos.racha, encendida && estilos.rachaEncendida]}
            accessible
            accessibilityLabel={`Racha de ${dias} ${dias === 1 ? "día" : "días"}${dias > 0 && !encendida ? ". Completa una lección o un repaso hoy para no perderla" : ""}`}
          >
            <Icono nombre="racha" tam={20} peso="fill" color={encendida ? color.coral : color.bloqueado} />
            <Text style={[estilos.rachaTexto, encendida && { color: color.logroTexto }]}>{dias}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Perfil" onPress={() => router.push("/perfil")} style={estilos.avatar}>
            <Text style={estilos.inicial}>{usuario?.nombre.trim().charAt(0).toUpperCase()}</Text>
          </Pressable>
        </View>
        <Text style={estilos.saludo}>Hola, {usuario?.nombre.split(" ")[0]}</Text>
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
        {unidadesConLecciones(paquete).map((u, n) => {
          const hechas = u.lecciones.filter((l) => completadas.includes(l.id)).length;
          // Una unidad está abierta cuando su primera lección ya se puede tomar.
          const abierta = estadoLeccion(todas, u.desde, completadas) !== "bloqueada";
          return (
            <View key={u.id}>
              <View
                style={[estilos.unidad, !abierta && estilos.unidadBloqueada]}
                accessible
                accessibilityRole="header"
                accessibilityLabel={`Unidad ${n + 1}: ${u.titulo}. ${hechas} de ${u.lecciones.length} lecciones completadas${abierta ? "" : ". Bloqueada"}`}
              >
                <Text style={[estilos.unidadEtiqueta, !abierta && { color: color.tenue }]}>
                  Unidad {n + 1} · {hechas} de {u.lecciones.length}
                </Text>
                <Text style={[estilos.unidadTitulo, !abierta && { color: color.tenue }]}>{u.titulo}</Text>
              </View>
              <View style={estilos.ruta}>
                {u.lecciones.map((l, j) => {
                  const estado = estadoLeccion(todas, u.desde + j, completadas);
                  const cuantos = ejerciciosDeLeccion(paquete, l, (archivo) => uriImagen(archivo) !== null).length;
                  const c = CIRCULO[estado];
                  const marca = marcas.find((m) => m.leccionId === l.id);
                  const ganadas = marca ? estrellas(marca.aciertos, marca.total) : 0;
                  return (
                    <View key={l.id} style={[estilos.parada, { transform: [{ translateX: ZIGZAG[j % ZIGZAG.length] }] }]}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ disabled: estado === "bloqueada" }}
                        accessibilityLabel={`Lección ${j + 1}: ${l.titulo}. ${estado === "completada" ? `Completada${marca ? `, ${ganadas} de 3 estrellas` : ""}` : estado === "bloqueada" ? "Bloqueada" : "Siguiente"}. ${cuantos} ejercicios`}
                        disabled={estado === "bloqueada" || cuantos === 0}
                        onPress={() => router.push({ pathname: "/leccion/[id]", params: { id: l.id } })}
                      >
                        {({ pressed }) => (
                          <View style={[estilos.circulo, { backgroundColor: c.fondo, borderColor: c.sombra }, pressed && estilos.hundido]}>
                            <Icono
                              nombre={estado === "completada" ? "check" : estado === "bloqueada" ? "candado" : "estrella"}
                              tam={34}
                              peso="fill"
                              color={c.icono}
                            />
                          </View>
                        )}
                      </Pressable>
                      {estado === "siguiente" && <Text style={estilos.empezar}>Empezar</Text>}
                      {marca && (
                        <View style={estilos.estrellas} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                          <Estrellas cuantas={ganadas} />
                        </View>
                      )}
                      <Text style={[estilos.tituloLeccion, estado === "bloqueada" && { color: color.bloqueado }]} numberOfLines={2}>
                        {l.titulo}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}

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
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, justifyContent: "center", alignItems: "stretch", padding: espacio.l, gap: espacio.m, backgroundColor: color.fondo },
  aviso: { fontSize: 17, fontFamily: fuente.media, color: color.tenue, textAlign: "center" },
  contenido: { padding: espacio.l, paddingBottom: espacio.xl },
  cabecera: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: espacio.m },
  saludo: { fontSize: 28, fontFamily: fuente.titulo, color: color.texto },
  racha: { flexDirection: "row", alignItems: "center", gap: espacio.xs, paddingHorizontal: espacio.m, paddingVertical: espacio.xs, borderRadius: 999, borderWidth: 2, borderColor: color.borde, backgroundColor: color.superficie },
  rachaEncendida: { borderColor: color.logro, backgroundColor: color.hueso },
  rachaTexto: { fontSize: 18, fontFamily: fuente.titulo, color: color.tenue },
  avatar: { width: TOQUE_MINIMO, height: TOQUE_MINIMO, borderRadius: TOQUE_MINIMO / 2, backgroundColor: color.marcaSuave, borderWidth: 2, borderColor: color.marca, alignItems: "center", justifyContent: "center" },
  inicial: { fontSize: 18, fontFamily: fuente.titulo, color: color.marcaTexto },
  offline: { marginTop: espacio.s, color: color.tenue, fontSize: 14, fontFamily: fuente.normal },
  repaso: { marginTop: espacio.l, flexDirection: "row", alignItems: "center", gap: espacio.m, padding: espacio.m, borderRadius: 16, borderWidth: 2, borderBottomWidth: 4, borderColor: color.borde, backgroundColor: color.superficie },
  repasoTitulo: { fontSize: 18, fontFamily: fuente.titulo, color: color.texto },
  repasoDetalle: { marginTop: 2, fontSize: 14, fontFamily: fuente.normal, color: color.tenue },
  unidad: { marginTop: espacio.l, marginBottom: espacio.l, padding: espacio.m, borderRadius: 16, backgroundColor: color.marca, borderBottomWidth: 4, borderColor: color.marcaSombra },
  unidadBloqueada: { backgroundColor: color.borde, borderColor: "#cfd5da" },
  unidadEtiqueta: { color: "#fff", fontSize: 14, fontFamily: fuente.negrita },
  unidadTitulo: { color: "#fff", fontSize: 20, fontFamily: fuente.titulo },
  ruta: { alignItems: "center", gap: espacio.l },
  parada: { alignItems: "center", width: 180 },
  circulo: { width: TAM, height: TAM, borderRadius: TAM / 2, borderBottomWidth: 6, alignItems: "center", justifyContent: "center" },
  hundido: { borderBottomWidth: 0, marginTop: 6 },
  estrellas: { marginTop: espacio.xs },
  empezar: { marginTop: espacio.xs, fontSize: 14, fontFamily: fuente.titulo, color: color.marcaTexto },
  tituloLeccion: { marginTop: espacio.xs, fontSize: 15, fontFamily: fuente.negrita, color: color.texto, textAlign: "center" },
});
