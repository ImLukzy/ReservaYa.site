-- Reglas opcionales; cero conserva el comportamiento actual.
ALTER TABLE "Complejo" ADD COLUMN "anticipacionMinMin" INTEGER NOT NULL DEFAULT 0,
                       ADD COLUMN "cancelacionMinMin" INTEGER NOT NULL DEFAULT 0,
                       ADD COLUMN "politica" TEXT;
