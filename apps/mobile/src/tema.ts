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
  marca: "#0e8c80",
  marcaSombra: "#0a6b62",
  marcaTexto: "#0b7369",
  marcaSuave: "#e0f4f1",
  /** Lo elegido antes de comprobar. */
  acento: "#4f4fcf",
  acentoSuave: "#ecebff",
  acentoBorde: "#b9b6ff",
  /** Músculo: los toques de color de la marca. */
  coral: "#f26d5b",
  coralTexto: "#b8412f",
  /** Hueso: fondos cálidos, como el del caso clínico. */
  hueso: "#f3e9d2",
  huesoTexto: "#6e5a32",
  verde: "#16743f",
  verdeSuave: "#dff6e8",
  verdeBoton: "#1f9d55",
  verdeSombra: "#177a42",
  rojo: "#b42318",
  rojoSuave: "#fde4e4",
  rojoBoton: "#d93a3a",
  rojoSombra: "#a82c2c",
  ambar: "#8a5a00",
  /** Logro: las lecciones completadas y el resultado. */
  logro: "#e8a317",
  logroSombra: "#c48810",
  logroTexto: "#5c3d00",
  bloqueado: "#a7aeb3",
  /** Relleno de la zona correcta sobre la imagen (semitransparente). */
  zonaCorrecta: "#2bb673",
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
