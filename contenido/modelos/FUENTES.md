# Modelos 3D de las regiones: fuente y licencia

`cadera-derecha` y `pierna-derecha` se arman con `construir.mjs` a partir de las mallas de BodyParts3D, según `regiones.json`. El modelo del muslo (`prototipos/modelo.json` y `.bin`) vino de otro archivo; estos usan el mismo formato y el mismo marco de coordenadas, así que encajan con él.

## Fuente

- **Paquete:** `isa_BP3D_4.0_obj_99.zip` (136 MB), BodyParts3D 4.0, árbol IS-A, mallas reducidas al 99 %. Se descargó el 28-10-2026 de <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/>. No se guarda en el repositorio.
- **Archivos usados:** los `FJ….obj` que lista `regiones.json`, con su nombre en inglés de BodyParts3D (`fuente`). Cada archivo trae en su cabecera el `Concept ID` de la FMA.
- **Licencia:** [CC BY 4.0](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html) según la página oficial de la licencia (actualizada el 27-02-2025). Las cabeceras de los `.obj` todavía dicen "CC Attribution-Share Alike 2.1 Japan"; es el texto anterior, que la página oficial reemplaza.
- **Atribución en la app:** "Modelo: BodyParts3D, © The Database Center for Life Science, CC BY 4.0. Simplificado y agrupado." (`LICENCIA_BODYPARTS3D` en la API).

## Cambios

- **Unidades y ejes:** de milímetros con Z hacia arriba a metros con Y hacia arriba, corrido al marco del modelo del muslo (comparando el glúteo medio, el fémur y el hueso coxal, que están en los dos).
- **Recortes:** en la cadera, el fémur desde 620 mm (la parte proximal); en la pierna, hasta 470 mm (la parte distal).
- **Agrupado:** las dos cabezas del gastrocnemio son una sola estructura; los huesos del pie, otra.
- **Formato:** posiciones cuantizadas a 16 bits, normales de 8 bits e índices de 16, como las lee `packages/visor3d`.

## Rearmarlos

```bash
unzip isa_BP3D_4.0_obj_99.zip -d bp3d
node contenido/modelos/construir.mjs --obj bp3d/isa_BP3D_4.0_obj_99
```
