-- Spec 66: marca del recordatorio enviado (uno por reserva). Columna opcional; no toca filas existentes.
ALTER TABLE "Reserva" ADD COLUMN "recordatorioEnviadoEn" TIMESTAMP(3);
