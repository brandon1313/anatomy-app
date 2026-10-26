"""
Prepara las imágenes del muslo a partir de los originales de Wikimedia Commons (ver FUENTES.md).

    python3 -m venv .venv && .venv/bin/pip install pillow numpy opencv-python-headless
    .venv/bin/python preparar.py <Anterior_view_of_the_thigh.png> <1122_Gluteal_Muscles_that_Move_the_Femur.jpg>

Escribe muslo-anterior.png y muslo-posterior.png en esta carpeta.
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

AQUI = Path(__file__).parent


def anterior(entrada: str) -> None:
    """Recorta el panel superficial (el izquierdo) y lo pone sobre fondo blanco. Ya viene sin etiquetas."""
    img = Image.open(entrada).convert("RGBA")
    opaco = np.array(img)[:, :, 3] > 16
    cols = opaco.any(axis=0)
    tramos, dentro, inicio = [], False, 0
    for x, v in enumerate(cols):
        if v and not dentro:
            inicio, dentro = x, True
        elif not v and dentro:
            tramos.append((inicio, x))
            dentro = False
    x0, x1 = [t for t in tramos if t[1] - t[0] > 50][0]
    filas = opaco[:, x0:x1].any(axis=1)
    y0, y1 = int(np.argmax(filas)), len(filas) - int(np.argmax(filas[::-1]))
    m = 12
    panel = img.crop((max(0, x0 - m), max(0, y0 - m), min(img.width, x1 + m), min(img.height, y1 + m)))
    fondo = Image.new("RGBA", panel.size, (255, 255, 255, 255))
    Image.alpha_composite(fondo, panel).convert("RGB").save(AQUI / "muslo-anterior.png", optimize=True)


def posterior(entrada: str) -> None:
    """Recorta la vista posterior y borra las líneas de las etiquetas (negro puro) rellenándolas con inpainting."""
    img = cv2.imread(entrada)
    rec = img[1190:2042, 1055:1432].copy()
    b, g, r = [rec[:, :, i].astype(int) for i in range(3)]
    maximo = np.maximum(np.maximum(r, g), b)
    minimo = np.minimum(np.minimum(r, g), b)
    mascara = ((maximo < 75) & (maximo - minimo < 30)).astype(np.uint8) * 255
    mascara = cv2.dilate(mascara, np.ones((5, 5), np.uint8), iterations=1)
    limpia = cv2.inpaint(rec, mascara, 6, cv2.INPAINT_TELEA)
    cv2.imwrite(str(AQUI / "muslo-posterior.png"), limpia, [cv2.IMWRITE_PNG_COMPRESSION, 9])


if __name__ == "__main__":
    anterior(sys.argv[1])
    posterior(sys.argv[2])
