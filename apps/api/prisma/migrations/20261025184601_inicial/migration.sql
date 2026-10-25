-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('estudiante', 'editor', 'admin');

-- CreateEnum
CREATE TYPE "EstadoRevision" AS ENUM ('borrador', 'en_revision', 'aprobada', 'rechazada');

-- CreateEnum
CREATE TYPE "EstadoReporte" AS ENUM ('abierto', 'resuelto');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "universidad" TEXT,
    "rol" "Rol" NOT NULL DEFAULT 'estudiante',
    "zona_horaria" TEXT NOT NULL DEFAULT 'America/Guatemala',
    "hora_recordatorio" TEXT,
    "creado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_renovacion" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "hash" TEXT NOT NULL,
    "expira" TIMESTAMP(3) NOT NULL,
    "creado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_renovacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fichas" (
    "id" TEXT NOT NULL,
    "estado" "EstadoRevision" NOT NULL DEFAULT 'borrador',
    "version" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "revisado_por" TEXT,
    "revisado_en" TIMESTAMP(3),
    "actualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fichas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imagenes" (
    "id" TEXT NOT NULL,
    "estado" "EstadoRevision" NOT NULL DEFAULT 'borrador',
    "version" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "archivo_url" TEXT NOT NULL,
    "actualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imagenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ejercicios" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" "EstadoRevision" NOT NULL DEFAULT 'borrador',
    "version" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "ficha_ids" TEXT[],
    "actualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ejercicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paquetes" (
    "version" INTEGER NOT NULL,
    "contenido" JSONB NOT NULL,
    "publicado_por" TEXT NOT NULL,
    "publicado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paquetes_pkey" PRIMARY KEY ("version")
);

-- CreateTable
CREATE TABLE "intentos" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "ejercicio_id" TEXT NOT NULL,
    "correcto" BOOLEAN NOT NULL,
    "ms_respuesta" INTEGER NOT NULL,
    "respondido_en" TIMESTAMP(3) NOT NULL,
    "paquete_version" INTEGER NOT NULL,

    CONSTRAINT "intentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progreso_ficha" (
    "usuario_id" UUID NOT NULL,
    "ficha_id" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "estabilidad" DOUBLE PRECISION NOT NULL,
    "dificultad" DOUBLE PRECISION NOT NULL,
    "dias_programados" INTEGER NOT NULL DEFAULT 0,
    "pasos_aprendizaje" INTEGER NOT NULL DEFAULT 0,
    "repeticiones" INTEGER NOT NULL,
    "lapsos" INTEGER NOT NULL,
    "ultima_revision" TIMESTAMP(3),
    "proxima_revision" TIMESTAMP(3) NOT NULL,
    "ultimo_ejercicio_id" TEXT,

    CONSTRAINT "progreso_ficha_pkey" PRIMARY KEY ("usuario_id","ficha_id")
);

-- CreateTable
CREATE TABLE "rachas" (
    "usuario_id" UUID NOT NULL,
    "actual" INTEGER NOT NULL DEFAULT 0,
    "maxima" INTEGER NOT NULL DEFAULT 0,
    "ultimo_dia" TEXT,

    CONSTRAINT "rachas_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateTable
CREATE TABLE "reportes_error" (
    "id" UUID NOT NULL,
    "ejercicio_id" TEXT NOT NULL,
    "usuario_id" UUID NOT NULL,
    "motivo" TEXT NOT NULL,
    "comentario" TEXT,
    "creado" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoReporte" NOT NULL DEFAULT 'abierto',

    CONSTRAINT "reportes_error_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "propiedades" JSONB NOT NULL DEFAULT '{}',
    "creado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interes_premium" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "plan" TEXT NOT NULL,
    "creado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interes_premium_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion" (
    "clave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "actualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("clave")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_renovacion_hash_key" ON "tokens_renovacion"("hash");

-- CreateIndex
CREATE INDEX "tokens_renovacion_usuario_id_idx" ON "tokens_renovacion"("usuario_id");

-- CreateIndex
CREATE INDEX "fichas_estado_idx" ON "fichas"("estado");

-- CreateIndex
CREATE INDEX "imagenes_estado_idx" ON "imagenes"("estado");

-- CreateIndex
CREATE INDEX "ejercicios_estado_idx" ON "ejercicios"("estado");

-- CreateIndex
CREATE INDEX "ejercicios_ficha_ids_idx" ON "ejercicios" USING GIN ("ficha_ids");

-- CreateIndex
CREATE INDEX "intentos_usuario_id_idx" ON "intentos"("usuario_id");

-- CreateIndex
CREATE INDEX "intentos_ejercicio_id_idx" ON "intentos"("ejercicio_id");

-- CreateIndex
CREATE INDEX "reportes_error_estado_idx" ON "reportes_error"("estado");

-- CreateIndex
CREATE INDEX "eventos_nombre_creado_idx" ON "eventos"("nombre", "creado");

-- AddForeignKey
ALTER TABLE "tokens_renovacion" ADD CONSTRAINT "tokens_renovacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intentos" ADD CONSTRAINT "intentos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progreso_ficha" ADD CONSTRAINT "progreso_ficha_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rachas" ADD CONSTRAINT "rachas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_error" ADD CONSTRAINT "reportes_error_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interes_premium" ADD CONSTRAINT "interes_premium_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
