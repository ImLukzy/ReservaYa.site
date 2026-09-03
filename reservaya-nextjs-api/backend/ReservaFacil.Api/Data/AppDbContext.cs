using Microsoft.EntityFrameworkCore;
using ReservaFacil.Api.Models;

namespace ReservaFacil.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Cancha> Canchas => Set<Cancha>();
    public DbSet<Reserva> Reservas => Set<Reserva>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresEnum<Rol>("public", "Rol");
        modelBuilder.HasPostgresEnum<EstadoReserva>("public", "EstadoReserva");
        modelBuilder.HasPostgresEnum<TipoCancha>("public", "TipoCancha");

        var usuario = modelBuilder.Entity<Usuario>();
        usuario.ToTable("Usuario").HasKey(u => u.Id);
        usuario.Property(u => u.Id).HasColumnName("id");
        usuario.Property(u => u.Nombre).HasColumnName("nombre");
        usuario.Property(u => u.Email).HasColumnName("email");
        usuario.Property(u => u.Password).HasColumnName("password");
        usuario.Property(u => u.Rol).HasColumnName("rol").HasDefaultValue(Rol.USUARIO);
        usuario.Property(u => u.Activo).HasColumnName("activo").HasDefaultValue(true);
        usuario.Property(u => u.TokenVersion).HasColumnName("tokenVersion").HasDefaultValue(0);
        usuario.Property(u => u.CreadoEn).HasColumnName("creadoEn")
            .HasColumnType("timestamp(3) without time zone").HasDefaultValueSql("CURRENT_TIMESTAMP");
        usuario.HasIndex(u => u.Email).IsUnique();
        usuario.HasIndex(u => u.Rol);

        var cancha = modelBuilder.Entity<Cancha>();
        cancha.ToTable("Cancha").HasKey(c => c.Id);
        cancha.Property(c => c.Id).HasColumnName("id");
        cancha.Property(c => c.Nombre).HasColumnName("nombre");
        cancha.Property(c => c.Tipo).HasColumnName("tipo");
        cancha.Property(c => c.Descripcion).HasColumnName("descripcion");
        cancha.Property(c => c.PrecioPorHora).HasColumnName("precioPorHora").HasPrecision(10, 2);
        cancha.Property(c => c.Capacidad).HasColumnName("capacidad");
        cancha.Property(c => c.Activa).HasColumnName("activa").HasDefaultValue(true);
        cancha.Property(c => c.Imagen).HasColumnName("imagen");
        cancha.Property(c => c.CreadoEn).HasColumnName("creadoEn")
            .HasColumnType("timestamp(3) without time zone").HasDefaultValueSql("CURRENT_TIMESTAMP");
        cancha.HasIndex(c => c.Tipo);
        cancha.HasIndex(c => c.Activa);

        var reserva = modelBuilder.Entity<Reserva>();
        reserva.ToTable("Reserva").HasKey(r => r.Id);
        reserva.Property(r => r.Id).HasColumnName("id");
        reserva.Property(r => r.UsuarioId).HasColumnName("usuarioId");
        reserva.Property(r => r.CanchaId).HasColumnName("canchaId");
        reserva.Property(r => r.Fecha).HasColumnName("fecha").HasColumnType("timestamp(3) without time zone");
        reserva.Property(r => r.HoraInicio).HasColumnName("horaInicio");
        reserva.Property(r => r.HoraFin).HasColumnName("horaFin");
        reserva.Property(r => r.Estado).HasColumnName("estado").HasDefaultValue(EstadoReserva.PENDIENTE);
        reserva.Property(r => r.Total).HasColumnName("total").HasPrecision(10, 2);
        reserva.Property(r => r.Notas).HasColumnName("notas");
        reserva.Property(r => r.CreadoEn).HasColumnName("creadoEn")
            .HasColumnType("timestamp(3) without time zone").HasDefaultValueSql("CURRENT_TIMESTAMP");
        reserva.HasIndex(r => new { r.CanchaId, r.Fecha });
        reserva.HasIndex(r => r.UsuarioId);
        reserva.HasIndex(r => r.Estado);
        reserva.HasOne(r => r.Usuario)
            .WithMany(u => u.Reservas)
            .HasForeignKey(r => r.UsuarioId)
            .OnDelete(DeleteBehavior.Restrict);
        reserva.HasOne(r => r.Cancha)
            .WithMany(c => c.Reservas)
            .HasForeignKey(r => r.CanchaId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}