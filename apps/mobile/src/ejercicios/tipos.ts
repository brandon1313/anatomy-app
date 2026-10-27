/** Lo que eligió el estudiante y cómo sale calificado; la lección lo revela al tocar Comprobar. */
export interface Eleccion {
  correcto: boolean;
  /** Algo más que decir al fallar ("Tocaste el vasto lateral."). */
  detalle?: string;
}

/**
 * Todos los ejercicios funcionan igual: elegir no califica y se puede cambiar. Cada cambio se avisa con
 * `onElegir` (null si no hay nada elegido); con `comprobado` el ejercicio muestra el resultado y se bloquea.
 */
export interface PropsEjercicio {
  comprobado: boolean;
  onElegir: (eleccion: Eleccion | null) => void;
}
