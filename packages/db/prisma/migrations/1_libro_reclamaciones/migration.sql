-- CreateTable
CREATE TABLE "Reclamo" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "correlativo" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "documentoTipo" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "domicilio" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "menor" BOOLEAN NOT NULL,
    "apoderado" TEXT,
    "apoderadoDocumento" TEXT,
    "apoderadoDomicilio" TEXT,
    "apoderadoTelefono" TEXT,
    "bienTipo" TEXT NOT NULL,
    "bienDescripcion" TEXT NOT NULL,
    "monto" DECIMAL(12,2),
    "detalle" TEXT NOT NULL,
    "pedido" TEXT NOT NULL,
    "medioRespuesta" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL,
    "estado" TEXT,
    "respuestaProveedor" TEXT,
    "respondidoEn" TIMESTAMP(3),

    CONSTRAINT "Reclamo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reclamo_anio_correlativo_key" ON "Reclamo"("anio", "correlativo");

-- CreateIndex
CREATE UNIQUE INDEX "Reclamo_numero_key" ON "Reclamo"("numero");

