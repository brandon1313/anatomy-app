// Genera los sonidos de la app (acierto, error y fin de lección) como WAV de 16 bits.
// Son propios, sintetizados por código: no dependen de licencias de terceros.
//   node scripts/sonidos.mjs   → assets/sonidos/*.wav
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MUESTRAS = 22050;
const salida = join(dirname(fileURLToPath(import.meta.url)), "../assets/sonidos");

/** Notas: [frecuencia en Hz, inicio en s, duración en s, forma, volumen 0–1]. */
function sintetizar(notas) {
  const total = Math.max(...notas.map(([, t, d]) => t + d)) + 0.05;
  const datos = new Float32Array(Math.ceil(total * MUESTRAS));
  for (const [f, t0, dur, forma, vol] of notas) {
    const ini = Math.floor(t0 * MUESTRAS);
    for (let i = 0; i < dur * MUESTRAS; i++) {
      const t = i / MUESTRAS;
      const fase = (t * f) % 1;
      const onda = forma === "cuadrada" ? (fase < 0.5 ? 1 : -1) : 1 - 4 * Math.abs(fase - 0.5); // triangular
      // Ataque de 12 ms y caída exponencial, como en el prototipo.
      const env = Math.min(1, t / 0.012) * Math.exp((-5 * t) / dur);
      datos[ini + i] += onda * env * vol;
    }
  }
  return datos;
}

function wav(datos) {
  const b = Buffer.alloc(44 + datos.length * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + datos.length * 2, 4); b.write("WAVE", 8);
  b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(MUESTRAS, 24); b.writeUInt32LE(MUESTRAS * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(datos.length * 2, 40);
  datos.forEach((x, i) => b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x)) * 32767), 44 + i * 2));
  return b;
}

const SONIDOS = {
  acierto: [[880, 0, 0.14, "triangular", 0.5], [1318.5, 0.08, 0.34, "triangular", 0.5]],
  error: [[233, 0, 0.16, "cuadrada", 0.18], [174.6, 0.12, 0.3, "cuadrada", 0.18]],
  fin: [523.25, 659.25, 783.99, 1046.5].map((f, k) => [f, k * 0.11, k === 3 ? 0.7 : 0.18, "triangular", 0.45]),
};

mkdirSync(salida, { recursive: true });
for (const [nombre, notas] of Object.entries(SONIDOS)) writeFileSync(join(salida, `${nombre}.wav`), wav(sintetizar(notas)));
console.log(`Sonidos en ${salida}`);
