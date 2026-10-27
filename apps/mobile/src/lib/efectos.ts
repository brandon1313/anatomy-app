import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export type Efecto = "elegir" | "acierto" | "error" | "fin" | "paso";
type Sonido = Exclude<Efecto, "elegir">;

const ARCHIVOS: Record<Sonido, number> = {
  acierto: require("../../assets/sonidos/acierto.wav"),
  error: require("../../assets/sonidos/error.wav"),
  fin: require("../../assets/sonidos/fin.wav"),
  paso: require("../../assets/sonidos/paso.wav"),
};
const reproductores: Partial<Record<Sonido, AudioPlayer>> = {};
const reproductor = (s: Sonido) => (reproductores[s] ??= createAudioPlayer(ARCHIVOS[s]));

/**
 * Crea los reproductores al abrir la app. Creados al primer uso, el primer sonido se pedía antes de
 * que el archivo terminara de cargar y no sonaba.
 */
export function precargarSonidos() {
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers" }).catch(() => {});
  try {
    for (const s of Object.keys(ARCHIVOS) as Sonido[]) reproductor(s);
  } catch {
    // Sin audio: la lección sigue sin sonidos.
  }
}

/**
 * Suena desde el principio. `seekTo` es asíncrono: si se llamaba a `play` sin esperarlo, un sonido que
 * ya había sonado arrancaba desde el final y no se oía nada. Si todavía está cargando, reintenta un
 * momento.
 */
function sonar(r: AudioPlayer, intentos = 10) {
  if (!r.isLoaded) {
    if (intentos > 0) setTimeout(() => sonar(r, intentos - 1), 100);
    return;
  }
  r.seekTo(0).then(
    () => r.play(),
    () => r.play(),
  );
}

/**
 * Sonido y vibración de cada momento de la lección. Respeta el modo silencio del teléfono y no corta la
 * música. Si algo falla (sin audio, web sin vibración), sigue sin efecto: nunca frena la lección.
 */
export function efecto(e: Efecto) {
  try {
    if (e !== "elegir") sonar(reproductor(e));
    if (Platform.OS === "web") return;
    const vibracion =
      e === "elegir" || e === "paso"
        ? Haptics.selectionAsync()
        : Haptics.notificationAsync(e === "error" ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success);
    vibracion.catch(() => {});
  } catch {
    // Sin efecto.
  }
}
