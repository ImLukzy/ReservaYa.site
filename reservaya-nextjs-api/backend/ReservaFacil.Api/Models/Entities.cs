namespace ReservaFacil.Api.Models;

public class Usuario
{
    public string Id { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
    public Rol Rol { get; set; } = Rol.USUARIO;
    public bool Activo { get; set; } = true;
    public int TokenVersion { get; set; }
    public DateTime CreadoEn { get; set; }
    // Identidad de jugador: fecha obligatoria al registrarse (luego inmutable),
    // username único mutable como máximo 1 vez por año.
    public DateTime? FechaNacimiento { get; set; }
    public string? Username { get; set; }
    public DateTime? UsernameCambiadoEn { get; set; }
    public string? Telefono { get; set; }
    public string? FotoUrl { get; set; }

    public List<Reserva> Reservas { get; set; } = new();
    public List<Resena> Resenas { get; set; } = new();
    public List<Complejo> ComplejosPropios { get; set; } = new();
    public List<ComplejoMiembro> Membresias { get; set; } = new();
    public List<MovimientoCaja> MovimientosCreados { get; set; } = new();
    public List<Sancion> SancionesRecibidas { get; set; } = new();
}

public class Complejo
{
    public string Id { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string? Descripcion { get; set; }
    public string Direccion { get; set; } = "";
    public string Distrito { get; set; } = "";
    public string Ciudad { get; set; } = "Arequipa";
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public string Slug { get; set; } = "";
    public bool Publicado { get; set; }
    public string DuenoId { get; set; } = "";
    public DateTime CreadoEn { get; set; }
    public DateTime ActualizadoEn { get; set; }

    public Usuario? Dueno { get; set; }
    public List<Cancha> Canchas { get; set; } = new();
    public List<Suscripcion> Suscripciones { get; set; } = new();
    public List<Reserva> Reservas { get; set; } = new();
    public List<ComplejoMiembro> Miembros { get; set; } = new();
    public List<Producto> Productos { get; set; } = new();
    public List<CajaSesion> Cajas { get; set; } = new();
    public List<MovimientoCaja> Movimientos { get; set; } = new();
    public List<Promocion> Promociones { get; set; } = new();
    public List<Resena> Resenas { get; set; } = new();
    public List<Torneo> Torneos { get; set; } = new();
    public List<Meta> Metas { get; set; } = new();
    public List<Sancion> Sanciones { get; set; } = new();
    public List<HorarioOperativo> Horarios { get; set; } = new();
}

public class ComplejoMiembro
{
    public string Id { get; set; } = "";
    public string UsuarioId { get; set; } = "";
    public string ComplejoId { get; set; } = "";
    public Rol RolSede { get; set; } = Rol.ADMIN;
    public bool Activo { get; set; } = true;
    public DateTime CreadoEn { get; set; }

    public Usuario? Usuario { get; set; }
    public Complejo? Complejo { get; set; }
}

public class Cancha
{
    public string Id { get; set; } = "";
    public string Nombre { get; set; } = "";
    public TipoCancha Tipo { get; set; }
    public string? Descripcion { get; set; }
    public decimal PrecioPorHora { get; set; }
    public int Capacidad { get; set; }
    public bool Techada { get; set; }
    public string? Superficie { get; set; }
    public bool Activa { get; set; } = true;
    public string? Imagen { get; set; }
    public string? ComplejoId { get; set; }
    public DateTime CreadoEn { get; set; }

    public Complejo? Complejo { get; set; }
    public List<Reserva> Reservas { get; set; } = new();
}

public class Reserva
{
    public string Id { get; set; } = "";
    public string Codigo { get; set; } = ""; // QR recepción RF-XXXX
    public string UsuarioId { get; set; } = "";
    public string CanchaId { get; set; } = "";
    public string? ComplejoId { get; set; }
    public DateTime Fecha { get; set; }
    public int HoraInicio { get; set; }
    public int HoraFin { get; set; }
    public EstadoReserva Estado { get; set; } = EstadoReserva.PENDIENTE;
    public EstadoPago EstadoPago { get; set; } = EstadoPago.PENDIENTE;
    public MetodoPago? MetodoPago { get; set; }
    public decimal Total { get; set; }
    public decimal MontoPagado { get; set; }
    public string? PromocionId { get; set; }
    public string? Notas { get; set; }
    public DateTime? ValidadaEn { get; set; }
    public string? ValidadaPorId { get; set; }
    public DateTime CreadoEn { get; set; }

    public Usuario? Usuario { get; set; }
    public Cancha? Cancha { get; set; }
    public Complejo? Complejo { get; set; }
}

public class Producto
{
    public string Id { get; set; } = "";
    public string ComplejoId { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string Categoria { get; set; } = "SNACK";
    public decimal Precio { get; set; }
    public int? Stock { get; set; }
    public bool Activo { get; set; } = true;

    public Complejo? Complejo { get; set; }
}

public class CajaSesion
{
    public string Id { get; set; } = "";
    public string ComplejoId { get; set; } = "";
    public string AbiertaPorId { get; set; } = "";
    public string? CerradaPorId { get; set; }
    public decimal MontoInicial { get; set; }
    public decimal? MontoFinal { get; set; }
    public EstadoCaja Estado { get; set; } = EstadoCaja.ABIERTA;
    public DateTime AbiertaEn { get; set; }
    public DateTime? CerradaEn { get; set; }

    public Complejo? Complejo { get; set; }
    public List<MovimientoCaja> Movimientos { get; set; } = new();
}

public class MovimientoCaja
{
    public string Id { get; set; } = "";
    public string ComplejoId { get; set; } = "";
    public string CajaId { get; set; } = "";
    public TipoMovimiento Tipo { get; set; }
    public MetodoPago MetodoPago { get; set; } = MetodoPago.EFECTIVO;
    public decimal Monto { get; set; }
    public string Descripcion { get; set; } = "";
    public string CreadoPorId { get; set; } = "";
    public string? ReservaId { get; set; }
    public string? ProductoId { get; set; }
    public DateTime CreadoEn { get; set; }

    public CajaSesion? Caja { get; set; }
}

public class Promocion
{
    public string Id { get; set; } = "";
    public string? ComplejoId { get; set; }
    public string? CanchaId { get; set; }
    public string Nombre { get; set; } = "";
    public string? Descripcion { get; set; }
    public TipoDescuento Tipo { get; set; }
    public decimal Valor { get; set; }
    public int? HoraDesde { get; set; }
    public int? HoraHasta { get; set; }
    public List<int> DiasSemana { get; set; } = new();
    public DateTime? FechaInicio { get; set; }
    public DateTime? FechaFin { get; set; }
    // Franjas día/tarde/noche (panel Precios especiales). Si alguna tiene
    // precio, el total se calcula por hora según franja; si no, vale el
    // modelo legacy (Valor dentro de [HoraDesde, HoraHasta)).
    public decimal? PrecioDia { get; set; }
    public decimal? PrecioTarde { get; set; }
    public decimal? PrecioNoche { get; set; }
    public int? InicioTarde { get; set; }
    public int? InicioNoche { get; set; }
    public bool RepetirAnual { get; set; }
    public string? Codigo { get; set; }
    public int? UsosMax { get; set; }
    public int UsosActuales { get; set; }
    public bool Activa { get; set; } = true;
    public DateTime CreadoEn { get; set; }

    public Complejo? Complejo { get; set; }
}

public class Resena
{
    public string Id { get; set; } = "";
    public string ComplejoId { get; set; } = "";
    public string UsuarioId { get; set; } = "";
    public int Puntuacion { get; set; }
    public string? Comentario { get; set; }
    public string? RespuestaDueno { get; set; }
    public DateTime CreadoEn { get; set; }

    public Complejo? Complejo { get; set; }
    public Usuario? Usuario { get; set; }
}

public class Torneo
{
    public string Id { get; set; } = "";
    public string ComplejoId { get; set; } = "";
    public string Nombre { get; set; } = "";
    public TipoCancha Deporte { get; set; } = TipoCancha.FUTBOL7;
    public DateTime FechaInicio { get; set; }
    public DateTime? FechaFin { get; set; }
    public decimal CostoInscripcion { get; set; }
    public int CupoMax { get; set; } = 16;
    public string? Premio { get; set; }
    public string? Reglamento { get; set; }
    public EstadoTorneo Estado { get; set; } = EstadoTorneo.BORRADOR;
    public DateTime CreadoEn { get; set; }

    public Complejo? Complejo { get; set; }
    public List<InscripcionTorneo> Inscripciones { get; set; } = new();
    public List<PartidoTorneo> Partidos { get; set; } = new();
}

public class InscripcionTorneo
{
    public string Id { get; set; } = "";
    public string TorneoId { get; set; } = "";
    public string Equipo { get; set; } = "";
    public string CapitanId { get; set; } = "";
    public string? Telefono { get; set; }
    public bool Pagado { get; set; }
    public DateTime CreadoEn { get; set; }

    public Torneo? Torneo { get; set; }
}

public class PartidoTorneo
{
    public string Id { get; set; } = "";
    public string TorneoId { get; set; } = "";
    public string Fase { get; set; } = "Grupos";
    public string EquipoA { get; set; } = "";
    public string EquipoB { get; set; } = "";
    public int? GolesA { get; set; }
    public int? GolesB { get; set; }
    public DateTime? Fecha { get; set; }
    public string? CanchaId { get; set; }
    public string? Ganador { get; set; }

    public Torneo? Torneo { get; set; }
}

public class Meta
{
    public string Id { get; set; } = "";
    public string ComplejoId { get; set; } = "";
    public string Titulo { get; set; } = "";
    public TipoMeta Tipo { get; set; }
    public decimal Objetivo { get; set; }
    public decimal Actual { get; set; }
    public DateTime PeriodoInicio { get; set; }
    public DateTime PeriodoFin { get; set; }

    public Complejo? Complejo { get; set; }
}

// Sanción del dueño al jugador que reservó: ADVERTENCIA califica/amonesta
// (visible, no bloquea), BLOQUEO impide reservar y avisa en recepción.
public class Sancion
{
    public string Id { get; set; } = "";
    public string ComplejoId { get; set; } = "";
    public string UsuarioId { get; set; } = "";
    public NivelSancion Nivel { get; set; }
    public string Motivo { get; set; } = "";
    public bool Activa { get; set; } = true;
    public string CreadoPorId { get; set; } = "";
    public DateTime CreadoEn { get; set; }

    public Complejo? Complejo { get; set; }
    public Usuario? Usuario { get; set; }
}
public class Suscripcion
{
    public string Id { get; set; } = "";
    public string ComplejoId { get; set; } = "";
    public TipoPlan Plan { get; set; }
    public EstadoSuscripcion Estado { get; set; } = EstadoSuscripcion.ACTIVA;
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFin { get; set; }
    public DateTime CreadoEn { get; set; }

    public Complejo? Complejo { get; set; }
}

// Horario operativo semanal del complejo (0 = domingo, como DayOfWeek).
// canchaId null = default del complejo; con canchaId = override por cancha.
// Se genera Lun-Dom 08:00-21:00 automáticamente con la primera reserva.
public class HorarioOperativo
{
    public string Id { get; set; } = "";
    public string ComplejoId { get; set; } = "";
    public string? CanchaId { get; set; }
    public int DiaSemana { get; set; }
    public int AperturaMin { get; set; }
    public int CierreMin { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime CreadoEn { get; set; }

    public Complejo? Complejo { get; set; }
}
