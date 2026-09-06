-- Backfill de deriva EF Core / Prisma vs Neon.
-- La tabla "Reserva" se creó con el MVP (10 columnas) y el modelo creció:
-- codigo, complejoId, estadoPago, metodoPago, montoPagado, promocionId,
-- validadaEn, validadaPorId. Sin ellas, TODA consulta de reservas falla con
-- 500 (42703: column r.codigo does not exist) y el dashboard cae por usuario.
-- Igual para "Cancha": techada, superficie, complejoId.
-- Idempotente: re-ejecutable sin efectos (IF NOT EXISTS + backfill acotado).

-- Tipos enum que el modelo espera y Neon aún no tiene.
DO $$ BEGIN
  CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'PAGADO', 'PARCIAL', 'REEMBOLSADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'YAPE', 'CULQI', 'TARJETA', 'TRANSFERENCIA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Reserva: columnas faltantes (sin FKs: Complejo/Promocion aún no existen como tablas).
ALTER TABLE "Reserva" ADD COLUMN IF NOT EXISTS "codigo" TEXT;
ALTER TABLE "Reserva" ADD COLUMN IF NOT EXISTS "complejoId" TEXT;
ALTER TABLE "Reserva" ADD COLUMN IF NOT EXISTS "estadoPago" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE';
ALTER TABLE "Reserva" ADD COLUMN IF NOT EXISTS "metodoPago" "MetodoPago";
ALTER TABLE "Reserva" ADD COLUMN IF NOT EXISTS "montoPagado" NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE "Reserva" ADD COLUMN IF NOT EXISTS "promocionId" TEXT;
ALTER TABLE "Reserva" ADD COLUMN IF NOT EXISTS "validadaEn" TIMESTAMP(3);
ALTER TABLE "Reserva" ADD COLUMN IF NOT EXISTS "validadaPorId" TEXT;

-- Backfill de códigos QR únicos para las reservas existentes.
UPDATE "Reserva"
SET "codigo" = 'RF-' || UPPER(SUBSTRING(MD5(id || '-rf') FROM 1 FOR 4))
WHERE "codigo" IS NULL OR "codigo" = '';

ALTER TABLE "Reserva" ALTER COLUMN "codigo" SET NOT NULL;
-- Red de seguridad: si un cliente viejo inserta sin código, la DB genera uno.
ALTER TABLE "Reserva" ALTER COLUMN "codigo"
  SET DEFAULT ('RF-' || UPPER(SUBSTRING(MD5(gen_random_uuid()::text) FROM 1 FOR 4)));
CREATE UNIQUE INDEX IF NOT EXISTS "Reserva_codigo_key" ON "Reserva"("codigo");
CREATE INDEX IF NOT EXISTS "Reserva_complejoId_fecha_idx" ON "Reserva"("complejoId", "fecha");
CREATE INDEX IF NOT EXISTS "Reserva_estado_idx" ON "Reserva"("estado");

-- Cancha: columnas faltantes.
ALTER TABLE "Cancha" ADD COLUMN IF NOT EXISTS "techada" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Cancha" ADD COLUMN IF NOT EXISTS "superficie" TEXT;
ALTER TABLE "Cancha" ADD COLUMN IF NOT EXISTS "complejoId" TEXT;
CREATE INDEX IF NOT EXISTS "Cancha_complejoId_idx" ON "Cancha"("complejoId");
