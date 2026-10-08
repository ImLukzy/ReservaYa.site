-- Coordenadas opcionales; conserva los complejos existentes y su publicación.
ALTER TABLE "Complejo" ADD COLUMN "latitud" DOUBLE PRECISION,
                       ADD COLUMN "longitud" DOUBLE PRECISION;
