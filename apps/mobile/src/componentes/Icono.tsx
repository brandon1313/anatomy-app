import { ArrowLeftIcon } from "phosphor-react-native/src/icons/ArrowLeft";
import { CaretRightIcon } from "phosphor-react-native/src/icons/CaretRight";
import { CheckFatIcon } from "phosphor-react-native/src/icons/CheckFat";
import { FireIcon } from "phosphor-react-native/src/icons/Fire";
import { FlagIcon } from "phosphor-react-native/src/icons/Flag";
import { LockSimpleIcon } from "phosphor-react-native/src/icons/LockSimple";
import { PlayIcon } from "phosphor-react-native/src/icons/Play";
import { StarIcon } from "phosphor-react-native/src/icons/Star";
import { TrophyIcon } from "phosphor-react-native/src/icons/Trophy";
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
