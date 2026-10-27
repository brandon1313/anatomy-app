import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export type Efecto = "elegir" | "acierto" | "error" | "fin";
type Sonido = Exclude<Efecto, "elegir">;

const ARCHIVOS: Record<Sonido, number> = {
  acierto: require("../../assets/sonidos/acierto.wav"),
  error: require("../../assets/sonidos/error.wav"),
  fin: require("../../assets/sonidos/fin.wav"),
};
const reproductores: Partial<Record<Sonido, AudioPlayer>> = {};

// Respeta el modo silencio del teléfono y no corta la música que esté sonando.
setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers" }).catch(() => {});

/**
 * Sonido y vibración de cada momento de la lección. Si algo falla (sin audio, web sin vibración) se
 * sigue sin efecto: nunca debe frenar la lección.
 */
export function efecto(e: Efecto) {
  try {
    if (e !== "elegir") {
      const r = (reproductores[e] ??= createAudioPlayer(ARCHIVOS[e]));
      r.seekTo(0).catch(() => {});
      r.play();
    }
    if (Platform.OS === "web") return;
    if (e === "elegir") void Haptics.selectionAsync();
    else void Haptics.notificationAsync(e === "error" ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success);
  } catch {
    // Sin efecto.
  }
}
