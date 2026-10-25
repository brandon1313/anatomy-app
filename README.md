# Anatomía (nombre provisional)

App de lecciones cortas de anatomía con contenido redactado por IA y aprobado por una revisora. Especificación completa en [docs/PRD.md](docs/PRD.md).

| Paquete | Qué es |
| --- | --- |
| `packages/contenido` | Esquema zod (contrato de datos), `distanciaABorde`, regla del toque y validación de la salida del generador |
| `apps/api` | NestJS + Prisma + PostgreSQL: autenticación, cola de revisión y generador |
| `apps/panel` | React + Vite: panel interno para la revisora y el admin |
| `apps/mobile` | Pendiente (semana 2) |

## Arrancar en local

Requisitos: Node 22, pnpm 9 y Docker.

```bash
pnpm install
pnpm db:up                                          # Postgres 16 en el puerto 5433
cp apps/api/.env.example apps/api/.env              # y pon un JWT_SECRETO propio
pnpm --filter @anatomia/contenido build
pnpm --filter @anatomia/api prisma:deploy
pnpm --filter @anatomia/api dev                     # API en :3000
pnpm --filter @anatomia/panel dev                   # panel en :5174 (redirige /api a :3000)
```

El primer editor o admin se crea registrándose (`POST /auth/registro`) y cambiando el rol:

```bash
pnpm --filter @anatomia/api rol --email revisora@ejemplo.com --rol editor
```

## Generador

```bash
pnpm --filter @anatomia/api generar --unidad musculos-muslo --musculos "Recto femoral, Vasto lateral"
```

También desde el panel, en **Generar**. Cada músculo produce 1 ficha y 4 ejercicios (2 de opción múltiple, 1 de emparejar y 1 caso clínico), validados con `SalidaGenerador` y con las reglas del prompt. Si algo no valida, se reintenta hasta 2 veces pasando los errores al modelo. Todo entra como `borrador`, versión 1, y nunca pisa una ficha que ya existe.

- `LLM_PROVEEDOR=anthropic` usa Claude (`LLM_MODELO`, por defecto `claude-opus-5-5`) con salida estructurada. Las credenciales salen de `ANTHROPIC_API_KEY` o del perfil de `ant auth login`.
- `LLM_PROVEEDOR=ejemplo` devuelve la salida de ejemplo del recto femoral, sin llamar a ningún LLM. Sirve para probar el flujo.

## Pruebas

```bash
pnpm test        # contenido + api
pnpm typecheck
```

## Decisiones tomadas sobre el PRD

- **Cambios al esquema** (marcados al inicio de `esquema-contenido.ts`):
  - `SalidaGenerador` solo acepta los 3 tipos de ejercicio de texto.
  - `ProgresoFicha.dificultad` acepta 0, como en las tarjetas nuevas de ts-fsrs.
  - `ProgresoFicha` agrega `diasProgramados`, `pasosAprendizaje` y `ultimoEjercicioId`.
- **Estados:**
  - Editar algo aprobado lo regresa a `en_revision` y sube su versión.
  - Editar algo rechazado lo regresa a `en_revision` y conserva la nota.
  - "Enviar a revisión" pasa un borrador a `en_revision`.
  - Se puede aprobar desde borrador, en revisión o rechazada.
- **Tablas extra:** `tokens_renovacion` (se guarda solo el hash y se rotan en cada renovación) y `configuracion` (firma del revisor y precio de Premium).
- **Borrar la cuenta** borra en cascada todos los datos del usuario, incluidos intentos y eventos.
- **Curso:** el PRD no decía dónde se arma. El panel tiene la página **Curso** (lecciones y sus ejercicios) y la API `GET`/`PUT /admin/curso`. La beta tiene un solo curso. El id de cada lección sale de su título al crearla y no cambia, porque el progreso del estudiante depende de él.
- **Publicar** (solo admin, `POST /admin/publicar`):
  - Arma el paquete solo con lo aprobado y corre `PaqueteContenido.parse` y `erroresDeConsistencia`.
  - Si una lección incluye algo sin aprobar, el error dice su estado en vez de "no existe".
  - No publica una versión idéntica a la anterior (409).
- **Paquete actual:** la app lo pide con `GET /paquete/actual?desde=N`, que trae el contenido solo si hay una versión más nueva que N.
