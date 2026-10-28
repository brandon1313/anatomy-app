-- CreateTable
CREATE TABLE "marcas_leccion" (
    "usuario_id" UUID NOT NULL,
    "leccion_id" TEXT NOT NULL,
    "aciertos" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "logrado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marcas_leccion_pkey" PRIMARY KEY ("usuario_id","leccion_id")
);

-- AddForeignKey
ALTER TABLE "marcas_leccion" ADD CONSTRAINT "marcas_leccion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
