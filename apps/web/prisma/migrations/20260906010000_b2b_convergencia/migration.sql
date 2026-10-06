DO $$ BEGIN
  CREATE TYPE "TipoMovimiento" AS ENUM ('RESERVA', 'SNACK', 'ALQUILER', 'ABONO', 'EGRESO', 'AJUSTE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EstadoCaja" AS ENUM ('ABIERTA', 'CERRADA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EstadoTorneo" AS ENUM ('BORRADOR', 'INSCRIPCIONES_ABIERTAS', 'EN_CURSO', 'FINALIZADO', 'CANCELADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TipoDescuento" AS ENUM ('PORCENTAJE', 'MONTO_FIJO', 'PRECIO_ESPECIAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TipoMeta" AS ENUM ('INGRESOS', 'OCUPACION', 'RESERVAS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum
ALTER TYPE "Rol" ADD VALUE 'PERSONAL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoCancha" ADD VALUE 'FUTBOL5';
ALTER TYPE "TipoCancha" ADD VALUE 'FUTBOL7';
ALTER TYPE "TipoCancha" ADD VALUE 'PADEL';
ALTER TYPE "TipoCancha" ADD VALUE 'LOZA';

-- AlterTable
ALTER TABLE "Cancha" ADD COLUMN     "fotos" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Reserva" ALTER COLUMN "fecha" SET DATA TYPE DATE,
ALTER COLUMN "codigo" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Complejo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "direccion" TEXT NOT NULL,
    "distrito" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL DEFAULT 'Arequipa',
    "telefono" TEXT,
    "email" TEXT,
    "fotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT NOT NULL,
    "duenoId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complejo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplejoMiembro" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "complejoId" TEXT NOT NULL,
    "rolSede" "Rol" NOT NULL DEFAULT 'PERSONAL',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplejoMiembro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "complejoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'SNACK',
    "precio" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CajaSesion" (
    "id" TEXT NOT NULL,
    "complejoId" TEXT NOT NULL,
    "abiertaPorId" TEXT NOT NULL,
    "cerradaPorId" TEXT,
    "montoInicial" DECIMAL(10,2) NOT NULL,
    "montoFinal" DECIMAL(10,2),
    "estado" "EstadoCaja" NOT NULL DEFAULT 'ABIERTA',
    "abiertaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradaEn" TIMESTAMP(3),

    CONSTRAINT "CajaSesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoCaja" (
    "id" TEXT NOT NULL,
    "complejoId" TEXT NOT NULL,
    "cajaId" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "metodoPago" "MetodoPago" NOT NULL DEFAULT 'EFECTIVO',
    "monto" DECIMAL(10,2) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "reservaId" TEXT,
    "productoId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promocion" (
    "id" TEXT NOT NULL,
    "complejoId" TEXT,
    "canchaId" TEXT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoDescuento" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "horaDesde" INTEGER,
    "horaHasta" INTEGER,
    "diasSemana" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "fechaInicio" DATE,
    "fechaFin" DATE,
    "codigo" TEXT,
    "usosMax" INTEGER,
    "usosActuales" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Promocion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resena" (
    "id" TEXT NOT NULL,
    "complejoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "puntuacion" INTEGER NOT NULL,
    "comentario" TEXT,
    "respuestaDueno" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resena_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Torneo" (
    "id" TEXT NOT NULL,
    "complejoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "deporte" "TipoCancha" NOT NULL DEFAULT 'FUTBOL7',
    "fechaInicio" DATE NOT NULL,
    "fechaFin" DATE,
    "costoInscripcion" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cupoMax" INTEGER NOT NULL DEFAULT 16,
    "premio" TEXT,
    "reglamento" TEXT,
    "estado" "EstadoTorneo" NOT NULL DEFAULT 'BORRADOR',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Torneo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InscripcionTorneo" (
    "id" TEXT NOT NULL,
    "torneoId" TEXT NOT NULL,
    "equipo" TEXT NOT NULL,
    "capitanId" TEXT NOT NULL,
    "telefono" TEXT,
    "pagado" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InscripcionTorneo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartidoTorneo" (
    "id" TEXT NOT NULL,
    "torneoId" TEXT NOT NULL,
    "fase" TEXT NOT NULL,
    "equipoA" TEXT NOT NULL,
    "equipoB" TEXT NOT NULL,
    "golesA" INTEGER,
    "golesB" INTEGER,
    "fecha" TIMESTAMP(3),
    "canchaId" TEXT,
    "ganador" TEXT,

    CONSTRAINT "PartidoTorneo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meta" (
    "id" TEXT NOT NULL,
    "complejoId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" "TipoMeta" NOT NULL,
    "objetivo" DECIMAL(12,2) NOT NULL,
    "actual" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "periodoInicio" DATE NOT NULL,
    "periodoFin" DATE NOT NULL,

    CONSTRAINT "Meta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Complejo_slug_key" ON "Complejo"("slug");

-- CreateIndex
CREATE INDEX "Complejo_duenoId_idx" ON "Complejo"("duenoId");

-- CreateIndex
CREATE INDEX "Complejo_publicado_idx" ON "Complejo"("publicado");

-- CreateIndex
CREATE INDEX "Complejo_distrito_idx" ON "Complejo"("distrito");

-- CreateIndex
CREATE INDEX "ComplejoMiembro_complejoId_idx" ON "ComplejoMiembro"("complejoId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplejoMiembro_usuarioId_complejoId_key" ON "ComplejoMiembro"("usuarioId", "complejoId");

-- CreateIndex
CREATE INDEX "Producto_complejoId_activo_idx" ON "Producto"("complejoId", "activo");

-- CreateIndex
CREATE INDEX "CajaSesion_complejoId_estado_idx" ON "CajaSesion"("complejoId", "estado");

-- CreateIndex
CREATE INDEX "MovimientoCaja_cajaId_idx" ON "MovimientoCaja"("cajaId");

-- CreateIndex
CREATE INDEX "MovimientoCaja_complejoId_creadoEn_idx" ON "MovimientoCaja"("complejoId", "creadoEn");

-- CreateIndex
CREATE INDEX "MovimientoCaja_tipo_idx" ON "MovimientoCaja"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "Promocion_codigo_key" ON "Promocion"("codigo");

-- CreateIndex
CREATE INDEX "Promocion_complejoId_activa_idx" ON "Promocion"("complejoId", "activa");

-- CreateIndex
CREATE INDEX "Resena_complejoId_idx" ON "Resena"("complejoId");

-- CreateIndex
CREATE UNIQUE INDEX "Resena_complejoId_usuarioId_key" ON "Resena"("complejoId", "usuarioId");

-- CreateIndex
CREATE INDEX "Torneo_complejoId_estado_idx" ON "Torneo"("complejoId", "estado");

-- CreateIndex
CREATE INDEX "InscripcionTorneo_torneoId_idx" ON "InscripcionTorneo"("torneoId");

-- CreateIndex
CREATE UNIQUE INDEX "InscripcionTorneo_torneoId_equipo_key" ON "InscripcionTorneo"("torneoId", "equipo");

-- CreateIndex
CREATE INDEX "PartidoTorneo_torneoId_fase_idx" ON "PartidoTorneo"("torneoId", "fase");

-- CreateIndex
CREATE INDEX "Meta_complejoId_idx" ON "Meta"("complejoId");

-- CreateIndex
CREATE INDEX "Reserva_codigo_idx" ON "Reserva"("codigo");

-- AddForeignKey
ALTER TABLE "Complejo" ADD CONSTRAINT "Complejo_duenoId_fkey" FOREIGN KEY ("duenoId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplejoMiembro" ADD CONSTRAINT "ComplejoMiembro_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplejoMiembro" ADD CONSTRAINT "ComplejoMiembro_complejoId_fkey" FOREIGN KEY ("complejoId") REFERENCES "Complejo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cancha" ADD CONSTRAINT "Cancha_complejoId_fkey" FOREIGN KEY ("complejoId") REFERENCES "Complejo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_validadaPorId_fkey" FOREIGN KEY ("validadaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_complejoId_fkey" FOREIGN KEY ("complejoId") REFERENCES "Complejo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_promocionId_fkey" FOREIGN KEY ("promocionId") REFERENCES "Promocion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_complejoId_fkey" FOREIGN KEY ("complejoId") REFERENCES "Complejo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CajaSesion" ADD CONSTRAINT "CajaSesion_complejoId_fkey" FOREIGN KEY ("complejoId") REFERENCES "Complejo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CajaSesion" ADD CONSTRAINT "CajaSesion_abiertaPorId_fkey" FOREIGN KEY ("abiertaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_complejoId_fkey" FOREIGN KEY ("complejoId") REFERENCES "Complejo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "CajaSesion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "Reserva"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promocion" ADD CONSTRAINT "Promocion_complejoId_fkey" FOREIGN KEY ("complejoId") REFERENCES "Complejo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promocion" ADD CONSTRAINT "Promocion_canchaId_fkey" FOREIGN KEY ("canchaId") REFERENCES "Cancha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resena" ADD CONSTRAINT "Resena_complejoId_fkey" FOREIGN KEY ("complejoId") REFERENCES "Complejo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resena" ADD CONSTRAINT "Resena_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Torneo" ADD CONSTRAINT "Torneo_complejoId_fkey" FOREIGN KEY ("complejoId") REFERENCES "Complejo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscripcionTorneo" ADD CONSTRAINT "InscripcionTorneo_torneoId_fkey" FOREIGN KEY ("torneoId") REFERENCES "Torneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscripcionTorneo" ADD CONSTRAINT "InscripcionTorneo_capitanId_fkey" FOREIGN KEY ("capitanId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartidoTorneo" ADD CONSTRAINT "PartidoTorneo_torneoId_fkey" FOREIGN KEY ("torneoId") REFERENCES "Torneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartidoTorneo" ADD CONSTRAINT "PartidoTorneo_canchaId_fkey" FOREIGN KEY ("canchaId") REFERENCES "Cancha"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meta" ADD CONSTRAINT "Meta_complejoId_fkey" FOREIGN KEY ("complejoId") REFERENCES "Complejo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

