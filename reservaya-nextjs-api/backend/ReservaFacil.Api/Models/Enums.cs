namespace ReservaFacil.Api.Models;

// El único rol de trabajador es ADMIN (ver EquipoController). PERSONAL está
// en desuso pero se conserva el valor por la etiqueta existente en Postgres.
public enum Rol
{
    USUARIO,
    PERSONAL,
    ADMIN,
    SUPERADMIN,
    TECNICO
}

public enum EstadoReserva
{
    PENDIENTE,
    CONFIRMADA,
    CANCELADA,
    COMPLETADA
}

public enum TipoCancha
{
    FUTBOL,
    FUTBOL5,
    FUTBOL7,
    PADEL,
    TENIS,
    BASQUET,
    VOLLEYBALL,
    LOZA
}

public enum EstadoPago
{
    PENDIENTE,
    PAGADO,
    PARCIAL,
    REEMBOLSADO
}

public enum MetodoPago
{
    EFECTIVO,
    YAPE,
    CULQI,
    TARJETA,
    TRANSFERENCIA
}

public enum TipoMovimiento
{
    RESERVA,
    SNACK,
    ALQUILER,
    ABONO,
    EGRESO,
    AJUSTE
}

public enum EstadoCaja
{
    ABIERTA,
    CERRADA
}

public enum EstadoTorneo
{
    BORRADOR,
    INSCRIPCIONES_ABIERTAS,
    EN_CURSO,
    FINALIZADO,
    CANCELADO
}

public enum TipoDescuento
{
    PORCENTAJE,
    MONTO_FIJO,
    PRECIO_ESPECIAL
}

public enum TipoMeta
{
    INGRESOS,
    OCUPACION,
    RESERVAS
}

public enum TipoPlan
{
    MENSUAL,
    TRIMESTRAL,
    ANUAL
}

public enum EstadoSuscripcion
{
    PENDIENTE,
    ACTIVA,
    VENCIDA,
    CANCELADA,
    RECHAZADA
}

public enum NivelSancion
{
    ADVERTENCIA,
    BLOQUEO
}