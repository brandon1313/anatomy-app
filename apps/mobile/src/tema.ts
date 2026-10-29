/**
 * Identidad de Palpa (docs/IDENTIDAD.md): teal clínico como color de marca, índigo para lo elegido, coral
 * de músculo y marfil de hueso. El verde y el rojo quedan solo para acierto y error. Los colores que van
 * como texto tienen contraste AA sobre blanco; los rellenos de botón llevan texto grande.
 */
export const color = {
  fondo: "#ffffff",
  superficie: "#ffffff",
  texto: "#24323a",
  tenue: "#5c6b73",
  borde: "#e3e6ea",
  /** Marca: botones principales, progreso y la lección siguiente. */
  marca: "#009e8f",
  marcaSombra: "#007a6e",
  marcaTexto: "#00796d",
  marcaSuave: "#d6f5f0",
  /** Lo elegido antes de comprobar. */
  acento: "#5a4bf0",
  acentoSuave: "#eeebff",
  acentoBorde: "#b3a9ff",
  /** Músculo: los toques de color de la marca. */
  coral: "#ff6650",
  coralTexto: "#c23a26",
  /** Hueso: fondos cálidos, como el del caso clínico. */
  hueso: "#f8ecd0",
  huesoTexto: "#6e5a32",
  verde: "#11733c",
  verdeSuave: "#d9f8e5",
  verdeBoton: "#10a050",
  verdeSombra: "#0b7f3e",
  rojo: "#b42318",
  rojoSuave: "#ffe2e2",
  rojoBoton: "#e5363c",
  rojoSombra: "#b0262b",
  ambar: "#8a5a00",
  /** Logro: las lecciones completadas y el resultado. */
  logro: "#ffb41f",
  logroSombra: "#d99200",
  logroTexto: "#5c3d00",
  bloqueado: "#a7aeb3",
  /** Relleno de la zona correcta sobre la imagen (semitransparente). */
  zonaCorrecta: "#1fc46f",
};

/**
 * Lexend por peso (licencia SIL OFL, pensada para leer con facilidad). Con fuentes propias no se usa
 * fontWeight: iOS no encontraría la variante.
 */
export const fuente = {
  normal: "Lexend_400Regular",
  media: "Lexend_500Medium",
  negrita: "Lexend_600SemiBold",
  titulo: "Lexend_700Bold",
};

export const espacio = { xs: 4, s: 8, m: 16, l: 24, xl: 32 };

/** Área táctil mínima (PRD: 44 × 44). */
export const TOQUE_MINIMO = 44;
