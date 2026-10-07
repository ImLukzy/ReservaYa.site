-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EstadoCaja" AS ENUM ('ABIERTA', 'CERRADA');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'PAGADO', 'PARCIAL', 'REEMBOLSADO');

-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA');

-- CreateEnum
CREATE TYPE "EstadoSuscripcion" AS ENUM ('PENDIENTE', 'ACTIVA', 'VENCIDA', 'CANCELADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "EstadoTorneo" AS ENUM ('BORRADOR', 'INSCRIPCIONES_ABIERTAS', 'EN_CURSO', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'YAPE', 'CULQI', 'TARJETA', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "NivelSancion" AS ENUM ('ADVERTENCIA', 'BLOQUEO');

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('USUARIO', 'ADMIN', 'SUPERADMIN', 'PERSONAL', 'TECNICO');

-- CreateEnum
CREATE TYPE "TipoCancha" AS ENUM ('FUTBOL', 'TENIS', 'BASQUET', 'VOLLEYBALL', 'FUTBOL5', 'FUTBOL7', 'PADEL', 'LOZA');

-- CreateEnum
CREATE TYPE "TipoDescuento" AS ENUM ('PORCENTAJE', 'MONTO_FIJO', 'PRECIO_ESPECIAL');

-- CreateEnum
CREATE TYPE "TipoMeta" AS ENUM ('INGRESOS', 'OCUPACION', 'RESERVAS');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('RESERVA', 'SNACK', 'ALQUILER', 'ABONO', 'EGRESO', 'AJUSTE');

-- CreateEnum
CREATE TYPE "TipoPlan" AS ENUM ('MENSUAL', 'TRIMESTRAL', 'ANUAL');

-- CreateTable
CREATE TABLE "AnotacionPartido" (
    "id" TEXT NOT NULL,
    "partidoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnotacionPartido_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "Cancha" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoCancha" NOT NULL,
    "descripcion" TEXT,
    "precioPorHora" DECIMAL(10,2) NOT NULL,
    "capacidad" INTEGER NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "imagen" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "techada" BOOLEAN NOT NULL DEFAULT false,
    "superficie" TEXT,
    "complejoId" TEXT,
    "fotos" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Cancha_pkey" PRIMARY KEY ("id")
);

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
    "rolSede" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplejoMiembro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Horario" (
    "id" TEXT NOT NULL,
    "complejoId" TEXT NOT NULL,
    "canchaId" TEXT,
    "diaSemana" INTEGER NOT NULL,
    "aperturaMin" INTEGER NOT NULL,
    "cierreMin" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Horario_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "PartidoAbierto" (
    "id" TEXT NOT NULL,
    "organizadorId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "formato" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "cuposTotales" INTEGER NOT NULL,
    "distrito" TEXT NOT NULL,
    "cancha" TEXT NOT NULL,
    "superficie" TEXT,
    "precio" DECIMAL(10,2) NOT NULL,
    "fecha" DATE NOT NULL,
    "desdeMin" INTEGER NOT NULL,
    "hastaMin" INTEGER NOT NULL,
    "fotoUrl" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartidoAbierto_pkey" PRIMARY KEY ("id")
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
    "inicioNoche" INTEGER,
    "inicioTarde" INTEGER,
    "precioDia" DECIMAL(10,2),
    "precioNoche" DECIMAL(10,2),
    "precioTarde" DECIMAL(10,2),
    "repetirAnual" BOOLEAN NOT NULL DEFAULT false,

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
CREATE TABLE "Reserva" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "canchaId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "horaInicio" INTEGER NOT NULL,
    "horaFin" INTEGER NOT NULL,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'PENDIENTE',
    "total" DECIMAL(10,2) NOT NULL,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "codigo" TEXT NOT NULL,
    "complejoId" TEXT,
    "estadoPago" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "metodoPago" "MetodoPago",
    "montoPagado" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "promocionId" TEXT,
    "validadaEn" TIMESTAMP(3),
    "validadaPorId" TEXT,

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sancion" (
    "id" TEXT NOT NULL,
    "complejoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nivel" "NivelSancion" NOT NULL,
    "motivo" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sancion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suscripcion" (
    "id" TEXT NOT NULL,
    "complejoId" TEXT NOT NULL,
    "plan" "TipoPlan" NOT NULL,
    "estado" "EstadoSuscripcion" NOT NULL DEFAULT 'ACTIVA',
    "fechaInicio" DATE NOT NULL,
    "fechaFin" DATE NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Suscripcion_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'USUARIO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avatarUrl" TEXT,
    "fechaNacimiento" DATE,
    "fotoUrl" TEXT,
    "googleId" TEXT,
    "telefono" TEXT,
    "username" TEXT,
    "usernameCambiadoEn" TIMESTAMP(3),

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnotacionPartido_partidoId_idx" ON "AnotacionPartido"("partidoId");

-- CreateIndex
CREATE INDEX "IX_AnotacionPartido_usuarioId" ON "AnotacionPartido"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "AnotacionPartido_partidoId_usuarioId_key" ON "AnotacionPartido"("partidoId", "usuarioId");

-- CreateIndex
CREATE INDEX "CajaSesion_complejoId_estado_idx" ON "CajaSesion"("complejoId", "estado");

-- CreateIndex
CREATE INDEX "Cancha_activa_idx" ON "Cancha"("activa");

-- CreateIndex
CREATE INDEX "Cancha_complejoId_idx" ON "Cancha"("complejoId");

-- CreateIndex
CREATE INDEX "Cancha_tipo_idx" ON "Cancha"("tipo");

-- CreateIndex
CREATE INDEX "Complejo_distrito_idx" ON "Complejo"("distrito");

-- CreateIndex
CREATE INDEX "Complejo_duenoId_idx" ON "Complejo"("duenoId");

-- CreateIndex
CREATE INDEX "Complejo_publicado_idx" ON "Complejo"("publicado");

-- CreateIndex
CREATE UNIQUE INDEX "Complejo_slug_key" ON "Complejo"("slug");

-- CreateIndex
CREATE INDEX "ComplejoMiembro_complejoId_idx" ON "ComplejoMiembro"("complejoId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplejoMiembro_usuarioId_complejoId_key" ON "ComplejoMiembro"("usuarioId", "complejoId");

-- CreateIndex
CREATE INDEX "Horario_alcance_dia_idx" ON "Horario"("complejoId", "canchaId", "diaSemana");

-- CreateIndex
CREATE INDEX "Horario_complejoId_canchaId_diaSemana_idx" ON "Horario"("complejoId", "canchaId", "diaSemana");

-- CreateIndex
CREATE INDEX "Horario_complejoId_idx" ON "Horario"("complejoId");

-- CreateIndex
CREATE INDEX "InscripcionTorneo_torneoId_idx" ON "InscripcionTorneo"("torneoId");

-- CreateIndex
CREATE UNIQUE INDEX "InscripcionTorneo_torneoId_equipo_key" ON "InscripcionTorneo"("torneoId", "equipo");

-- CreateIndex
CREATE INDEX "Meta_complejoId_idx" ON "Meta"("complejoId");

-- CreateIndex
CREATE INDEX "MovimientoCaja_cajaId_idx" ON "MovimientoCaja"("cajaId");

-- CreateIndex
CREATE INDEX "MovimientoCaja_complejoId_creadoEn_idx" ON "MovimientoCaja"("complejoId", "creadoEn");

-- CreateIndex
CREATE INDEX "MovimientoCaja_tipo_idx" ON "MovimientoCaja"("tipo");

-- CreateIndex
CREATE INDEX "IX_PartidoAbierto_organizadorId" ON "PartidoAbierto"("organizadorId");

-- CreateIndex
CREATE INDEX "PartidoAbierto_distrito_idx" ON "PartidoAbierto"("distrito");

-- CreateIndex
CREATE INDEX "PartidoAbierto_fecha_idx" ON "PartidoAbierto"("fecha");

-- CreateIndex
CREATE INDEX "PartidoTorneo_torneoId_fase_idx" ON "PartidoTorneo"("torneoId", "fase");

-- CreateIndex
CREATE INDEX "Producto_complejoId_activo_idx" ON "Producto"("complejoId", "activo");

-- CreateIndex
CREATE INDEX "Promocion_complejoId_activa_idx" ON "Promocion"("complejoId", "activa");

-- CreateIndex
CREATE UNIQUE INDEX "Promocion_codigo_key" ON "Promocion"("codigo");

-- CreateIndex
CREATE INDEX "Resena_complejoId_idx" ON "Resena"("complejoId");

-- CreateIndex
CREATE UNIQUE INDEX "Resena_complejoId_usuarioId_key" ON "Resena"("complejoId", "usuarioId");

-- CreateIndex
CREATE INDEX "Reserva_canchaId_fecha_idx" ON "Reserva"("canchaId", "fecha");

-- CreateIndex
CREATE INDEX "Reserva_complejoId_fecha_idx" ON "Reserva"("complejoId", "fecha");

-- CreateIndex
CREATE INDEX "Reserva_estado_idx" ON "Reserva"("estado");

-- CreateIndex
CREATE INDEX "Reserva_usuarioId_idx" ON "Reserva"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Reserva_codigo_idx" ON "Reserva"("codigo");

-- CreateIndex
CREATE INDEX "Sancion_complejoId_idx" ON "Sancion"("complejoId");

-- CreateIndex
CREATE INDEX "Sancion_usuarioId_idx" ON "Sancion"("usuarioId");

-- CreateIndex
CREATE INDEX "Suscripcion_complejoId_idx" ON "Suscripcion"("complejoId");

-- CreateIndex
CREATE INDEX "Torneo_complejoId_estado_idx" ON "Torneo"("complejoId", "estado");

-- CreateIndex
CREATE INDEX "Usuario_rol_idx" ON "Usuario"("rol");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_googleId_key" ON "Usuario"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_username_key" ON "Usuario"("username");

-- AddForeignKey
ALTER TABLE "AnotacionPartido" ADD CONSTRAINT "AnotacionPartido_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "PartidoAbierto"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AnotacionPartido" ADD CONSTRAINT "AnotacionPartido_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CajaSesion" ADD CONSTRAINT "CajaSesion_abiertaPorId_fkey" FOREIGN KEY ("abiertaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CajaSesion" ADD CONSTRAINT "CajaSesion_complejoId_fkey" FOREIGN KEY ("complejoId") REFERENCES "Complejo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cancha" ADD CONSTRAINT "Cancha_complejoId_fkey" FOREIGN KEY ("complejoId") REFERENCES "Complejo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complejo" ADD CONSTRAINT "Complejo_duenoId_fkey" FOREIGN KEY ("duenoId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplejoMiembro" ADD CONSTRAINT "ComplejoMiembro_complejoId_fkey" FOREIGN KEY ("complejoId") REFERENCES "Complejo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplejoMiembro" ADD CONSTRAINT "ComplejoMiembro_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Horario" ADD CONSTRAINT "Horario_complejoId_fkey" FOREIGN KEY ("complejoId") REFERENCES "Complejo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscripcionTorneo" ADD CONSTRAINT "InscripcionTorneo_capitanId_fkey" FOREIGN KEY ("capitanId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscripcionTorneo" ADD CONSTRAINT "InscripcionTorneo_torneoId_fkey" FOREIGN KEY ("torneoId") REFERENCES "Torneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meta" ADD CONSTRAINT "Meta_complejoId_fkey" FOREIGN KEY ("complejoId") REFERENCES "Complejo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "CajaSesion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_complejoId_fkey" FOREIGN KEY ("complejoId") REFERENCES "Complejo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "Reserva"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartidoAbierto" ADD CONSTRAINT "PartidoAbierto_organizadorId_fkey" FOREIGN KEY ("organizadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PartidoTorneo" ADD CONSTRAINT "PartidoTorneo_canchaId_fkey" FOREIGN KEY ("canchaId") REFERENCES "Cancha"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartidoTorneo" ADD CONSTRAINT "PartidoTorneo_torneoId_fkey" FOREIGN KEY ("torneoId") REFERENCES "Torneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_complejoId_fkey" FOREIGN KEY ("complejoId") REFERENCES "Complejo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promocion" ADD CONSTRAINT "Promocion_canchaId_fkey" FOREIGN KEY ("canchaId") REFERENCES "Cancha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promocion" ADD CONSTRAINT "Promocion_complejoId_fkey" FOREIGN KEY ("complejoId") REFERENCES "Complejo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resena" ADD CONSTRAINT "Resena_complejoId_fkey" FOREIGN KEY ("complejoId") REFERENCES "Complejo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resena" ADD CONSTRAINT "Resena_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_canchaId_fkey" FOREIGN KEY ("canchaId") REFERENCES "Cancha"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_complejoId_fkey" FOREIGN KEY ("complejoId") REFERENCES "Complejo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_promocionId_fkey" FOREIGN KEY ("promocionId") REFERENCES "Promocion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_validadaPorId_fkey" FOREIGN KEY ("validadaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sancion" ADD CONSTRAINT "Sancion_complejoId_fkey" FOREIGN KEY ("complejoId") REFERENCES "Complejo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sancion" ADD CONSTRAINT "Sancion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_complejoId_fkey" FOREIGN KEY ("complejoId") REFERENCES "Complejo"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Torneo" ADD CONSTRAINT "Torneo_complejoId_fkey" FOREIGN KEY ("complejoId") REFERENCES "Complejo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

