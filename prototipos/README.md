# Prototipos del rediseño

Páginas sueltas para probar el rediseño en el teléfono antes de pasarlo a la app. No forman parte del build ni del workspace. El plan está en [docs/PLAN-REDISENO.md](../docs/PLAN-REDISENO.md).

| Archivo | Qué es |
| --- | --- |
| `index.html` | Lección con la lámina 2D: elegir y luego Comprobar, zona resaltada al tocar, sonidos y **Ampliar** con scroll |
| `3d.html` | La misma lección con el modelo 3D del muslo: girar, pellizcar, vistas y tocar la estructura |
| `lamina.json` | Dibujo y zonas de la lámina `contenido/laminas/muslo-derecho-anterior.html` |
| `toque.js` | `esToqueCorrecto` y `zonaTocada` de `packages/contenido` (incluye zod, por eso pesa 450 KB) |
| `modelo.json`, `modelo.bin` | Datos sacados del archivo "Muslo derecho en 3D": nombres, vistas, capas y mallas cuantizadas |

## Verlos

```bash
python3 -m http.server 8092 --directory prototipos
```

En el teléfono, conectado a la misma red Wi-Fi: `http://<IP de la computadora>:8092/` (2D) y `http://<IP de la computadora>:8092/3d.html` (3D). Las fuentes y three.js vienen de CDN, así que hace falta internet. En el iPhone, el sonido no se oye con el interruptor de silencio activado.

Para regenerar `toque.js` después de cambiar la regla del toque:

```bash
node_modules/.bin/esbuild prototipos/toque.entrada.ts --bundle --format=esm --minify --outfile=prototipos/toque.js
```

## Créditos y límites

- **Mallas:** BodyParts3D, © The Database Center for Life Science, CC BY 4.0. Están simplificadas y agrupadas.
- **Nervio femoral:** es un trazado propio del autor del archivo 3D y su recorrido es aproximado.
- **Textos:** los del prototipo 3D vienen de ese archivo y no están revisados. La app usa solo fichas aprobadas.
