namespace ReservaFacil.Api.Models;

public enum Rol
{
    USUARIO,
    ADMIN,
    SUPERADMIN
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
    TENIS,
    BASQUET,
    VOLLEYBALL
}