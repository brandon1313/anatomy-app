/**
 * Colores del rediseño (docs/PLAN-REDISENO.md): más vivos y amigables, con paleta propia. Los que van
 * como texto tienen contraste AA sobre blanco; los rellenos de botón llevan texto grande en negrita.
 */
export const color = {
  fondo: "#ffffff",
  superficie: "#ffffff",
  texto: "#3c3c3c",
  tenue: "#6b6b6b",
  borde: "#e5e5e5",
  /** Selección y acciones secundarias. */
  acento: "#0e7bb8",
  acentoSuave: "#ddf4ff",
  acentoBorde: "#84d8ff",
  verde: "#2b7a0b",
  verdeSuave: "#d7ffb8",
  verdeBoton: "#46a302",
  verdeSombra: "#2f7a03",
  rojo: "#c62828",
  rojoSuave: "#ffdfe0",
  rojoBoton: "#e53935",
  rojoSombra: "#a52323",
  ambar: "#a35b00",
  oro: "#ffc800",
  bloqueado: "#afafaf",
  /** Relleno de la zona correcta sobre la imagen (semitransparente). */
  zonaCorrecta: "#3ddc84",
};

/** Nunito por peso: con fuentes propias no se usa fontWeight (iOS no encontraría la variante). */
export const fuente = {
  normal: "Nunito_600SemiBold",
  media: "Nunito_700Bold",
  negrita: "Nunito_800ExtraBold",
  titulo: "Nunito_900Black",
};

export const espacio = { xs: 4, s: 8, m: 16, l: 24, xl: 32 };

/** Área táctil mínima (PRD: 44 × 44). */
export const TOQUE_MINIMO = 44;
