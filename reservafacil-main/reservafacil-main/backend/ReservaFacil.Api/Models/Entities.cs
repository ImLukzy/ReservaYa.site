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

    public List<Reserva> Reservas { get; set; } = new();
}

public class Cancha
{
    public string Id { get; set; } = "";
    public string Nombre { get; set; } = "";
    public TipoCancha Tipo { get; set; }
    public string? Descripcion { get; set; }
    public decimal PrecioPorHora { get; set; }
    public int Capacidad { get; set; }
    public bool Activa { get; set; } = true;
    public string? Imagen { get; set; }
    public DateTime CreadoEn { get; set; }

    public List<Reserva> Reservas { get; set; } = new();
}

public class Reserva
{
    public string Id { get; set; } = "";
    public string UsuarioId { get; set; } = "";
    public string CanchaId { get; set; } = "";
    public DateTime Fecha { get; set; }
    public int HoraInicio { get; set; }
    public int HoraFin { get; set; }
    public EstadoReserva Estado { get; set; } = EstadoReserva.PENDIENTE;
    public decimal Total { get; set; }
    public string? Notas { get; set; }
    public DateTime CreadoEn { get; set; }

    public Usuario? Usuario { get; set; }
    public Cancha? Cancha { get; set; }
}