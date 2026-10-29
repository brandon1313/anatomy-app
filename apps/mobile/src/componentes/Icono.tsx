import { ArrowLeftIcon } from "phosphor-react-native/src/icons/ArrowLeft";
import { BellIcon } from "phosphor-react-native/src/icons/Bell";
import { BrainIcon } from "phosphor-react-native/src/icons/Brain";
import { CaretRightIcon } from "phosphor-react-native/src/icons/CaretRight";
import { CheckFatIcon } from "phosphor-react-native/src/icons/CheckFat";
import { EnvelopeSimpleIcon } from "phosphor-react-native/src/icons/EnvelopeSimple";
import { EyeIcon } from "phosphor-react-native/src/icons/Eye";
import { EyeSlashIcon } from "phosphor-react-native/src/icons/EyeSlash";
import { FireIcon } from "phosphor-react-native/src/icons/Fire";
import { FlagIcon } from "phosphor-react-native/src/icons/Flag";
import { GraduationCapIcon } from "phosphor-react-native/src/icons/GraduationCap";
import { HandTapIcon } from "phosphor-react-native/src/icons/HandTap";
import { HandWavingIcon } from "phosphor-react-native/src/icons/HandWaving";
import { LockSimpleIcon } from "phosphor-react-native/src/icons/LockSimple";
import { PlayIcon } from "phosphor-react-native/src/icons/Play";
import { StarIcon } from "phosphor-react-native/src/icons/Star";
import { TimerIcon } from "phosphor-react-native/src/icons/Timer";
import { TrophyIcon } from "phosphor-react-native/src/icons/Trophy";
import { UserIcon } from "phosphor-react-native/src/icons/User";
import { WarningCircleIcon } from "phosphor-react-native/src/icons/WarningCircle";
import { XIcon } from "phosphor-react-native/src/icons/X";
import type { IconWeight } from "phosphor-react-native";
import { View } from "react-native";
import { color as tema } from "../tema";

/**
 * Íconos de Phosphor (MIT) en lugar de emojis, que cada sistema dibuja distinto (docs/IDENTIDAD.md). Se
 * importan uno por uno: Metro no descarta los que no se usan.
 */
const ICONOS = {
  racha: FireIcon,
  candado: LockSimpleIcon,
  estrella: StarIcon,
  trofeo: TrophyIcon,
  /** CheckFat: su peso "fill" es el gordito; los demás pesos son de contorno. */
  check: CheckFatIcon,
  cerrar: XIcon,
  ver: PlayIcon,
  reportar: FlagIcon,
  atras: ArrowLeftIcon,
  siguiente: CaretRightIcon,
  alerta: WarningCircleIcon,
  /** Bienvenida y formularios de la cuenta. */
  saludo: HandWavingIcon,
  tiempo: TimerIcon,
  tocar: HandTapIcon,
  memoria: BrainIcon,
  correo: EnvelopeSimpleIcon,
  usuario: UserIcon,
  universidad: GraduationCapIcon,
  recordatorio: BellIcon,
  mostrar: EyeIcon,
  ocultar: EyeSlashIcon,
};

export type NombreIcono = keyof typeof ICONOS;

/** Decorativo: quien lo usa pone el texto accesible en el botón o la vista que lo contiene. */
export function Icono({ nombre, tam = 24, color = tema.texto, peso = "bold" }: { nombre: NombreIcono; tam?: number; color?: string; peso?: IconWeight }) {
  const I = ICONOS[nombre];
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <I size={tam} color={color} weight={peso} />
    </View>
  );
}
