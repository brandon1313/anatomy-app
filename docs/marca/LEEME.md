# Palpa · Archivos de marca (logo A, "Origen e inserción")

Colores: teal de marca `#009E8F`, coral (Músculo) `#FF6650` y blanco. El nombre usa Lexend Bold, pero en los SVG y PNG ya está convertido a trazos, así que no hace falta tener la fuente instalada.

## app/: va en `apps/mobile/assets/`

| Archivo | Tamaño | Para qué |
|---|---|---|
| `icon.png` | 1024 × 1024, sin transparencia | Ícono principal (iOS y respaldo en Android). Sin esquinas: el sistema aplica la máscara. |
| `adaptive-icon.png` | 1024 × 1024, transparente | Primer plano del ícono adaptable de Android. El símbolo cabe en el círculo seguro. |
| `adaptive-icon-monochrome.png` | 1024 × 1024, transparente | Íconos temáticos de Android 13 o superior. |
| `splash-icon.png` | 1024 × 1024, transparente | Pantalla de carga. |
| `notification-icon.png` | 96 × 96, silueta blanca | Ícono de las notificaciones en Android. |
| `favicon.png` | 48 × 48 | Versión web. |

## logo/

- `palpa-logo.svg` y `.png`: símbolo y nombre a color, para fondos claros.
- `palpa-logo-blanco.svg` y `.png`: todo en blanco, para el fondo teal o sobre fotos.
- `palpa-simbolo.svg` y `palpa-simbolo-blanco.svg`: solo el símbolo.

## redes/

- `avatar-redes.png`: 1080 × 1080, para el perfil de Instagram, TikTok y otras redes. Funciona recortado en círculo.

## Configuración en `apps/mobile/app.json`

Agrega o actualiza solo estas claves (las rutas son relativas a `apps/mobile`). Si `plugins` ya tiene `expo-splash-screen` o `expo-notifications`, actualiza esas entradas en lugar de duplicarlas. No cambies `slug` ni `scheme`.

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "monochromeImage": "./assets/adaptive-icon-monochrome.png",
        "backgroundColor": "#009E8F"
      }
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      [
        "expo-splash-screen",
        {
          "image": "./assets/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#FFFFFF"
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#009E8F"
        }
      ]
    ]
  }
}
```

El ícono y la pantalla de carga se ven a partir del siguiente build (EAS o desarrollo). En Expo Go siempre aparece el ícono de Expo Go.
