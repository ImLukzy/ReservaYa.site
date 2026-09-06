using Microsoft.EntityFrameworkCore;
using Npgsql;
using Npgsql.NameTranslation;
using ReservaFacil.Api.Models;

namespace ReservaFacil.Api.Data;

public sealed class MayusculasEnumTranslator : INpgsqlNameTranslator
{
    public string TranslateTypeName(string clrTypeName) => clrTypeName;
    public string TranslateMemberName(string clrMemberName) => clrMemberName.ToUpperInvariant();
}

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Complejo> Complejos => Set<Complejo>();
    public DbSet<ComplejoMiembro> ComplejoMiembros => Set<ComplejoMiembro>();
    public DbSet<Cancha> Canchas => Set<Cancha>();
    public DbSet<Reserva> Reservas => Set<Reserva>();
    public DbSet<Producto> Productos => Set<Producto>();
    public DbSet<CajaSesion> CajaSesiones => Set<CajaSesion>();
    public DbSet<MovimientoCaja> MovimientosCaja => Set<MovimientoCaja>();
    public DbSet<Promocion> Promociones => Set<Promocion>();
    public DbSet<Resena> Resenas => Set<Resena>();
    public DbSet<Torneo> Torneos => Set<Torneo>();
    public DbSet<InscripcionTorneo> InscripcionesTorneo => Set<InscripcionTorneo>();
    public DbSet<PartidoTorneo> PartidosTorneo => Set<PartidoTorneo>();
    public DbSet<Meta> Metas => Set<Meta>();
    public DbSet<Suscripcion> Suscripciones => Set<Suscripcion>();
    public DbSet<Sancion> Sanciones => Set<Sancion>();
    public DbSet<HorarioOperativo> Horarios => Set<HorarioOperativo>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresEnum<Rol>("public", "Rol");
        modelBuilder.HasPostgresEnum<EstadoReserva>("public", "EstadoReserva");
        modelBuilder.HasPostgresEnum<EstadoPago>("public", "EstadoPago");
        modelBuilder.HasPostgresEnum<MetodoPago>("public", "MetodoPago");
        modelBuilder.HasPostgresEnum<TipoCancha>("public", "TipoCancha");
        modelBuilder.HasPostgresEnum<TipoMovimiento>("public", "TipoMovimiento");
        modelBuilder.HasPostgresEnum<EstadoCaja>("public", "EstadoCaja");
        modelBuilder.HasPostgresEnum<EstadoTorneo>("public", "EstadoTorneo");
        modelBuilder.HasPostgresEnum<TipoDescuento>("public", "TipoDescuento");
        modelBuilder.HasPostgresEnum<TipoMeta>("public", "TipoMeta");
        // OJO Npgsql: sin traductor explícito genera los labels en minúsculas
        // ("activa") pero la DB usa MAYÚSCULAS (convención Prisma + runtime
        // NullNameTranslator que envía tal cual). Este traductor conserva el
        // nombre del tipo y mayuscula los miembros.
        modelBuilder.HasPostgresEnum<TipoPlan>("public", "TipoPlan", new MayusculasEnumTranslator());
        modelBuilder.HasPostgresEnum<EstadoSuscripcion>("public", "EstadoSuscripcion", new MayusculasEnumTranslator());
        modelBuilder.HasPostgresEnum<NivelSancion>("public", "NivelSancion", new MayusculasEnumTranslator());

        var usuario = modelBuilder.Entity<Usuario>();
        usuario.ToTable("Usuario").HasKey(u => u.Id).HasName("Usuario_pkey");
        usuario.Property(u => u.Id).HasColumnName("id");
        usuario.Property(u => u.Nombre).HasColumnName("nombre");
        usuario.Property(u => u.Email).HasColumnName("email");
        usuario.Property(u => u.Password).HasColumnName("password");
        usuario.Property(u => u.Rol).HasColumnName("rol").HasDefaultValue(Rol.USUARIO);
        usuario.Property(u => u.Activo).HasColumnName("activo").HasDefaultValue(true);
        usuario.Property(u => u.TokenVersion).HasColumnName("tokenVersion").HasDefaultValue(0);
        usuario.Property(u => u.FechaNacimiento).HasColumnName("fechaNacimiento").HasColumnType("date");
        usuario.Property(u => u.Username).HasColumnName("username");
        usuario.Property(u => u.UsernameCambiadoEn).HasColumnName("usernameCambiadoEn")
            .HasColumnType("timestamp(3) without time zone");
        usuario.Property(u => u.Telefono).HasColumnName("telefono");
        usuario.Property(u => u.FotoUrl).HasColumnName("fotoUrl");
        usuario.HasIndex(u => u.Username).IsUnique().HasDatabaseName("Usuario_username_key");
        usuario.Property(u => u.CreadoEn).HasColumnName("creadoEn")
            .HasColumnType("timestamp(3) without time zone").HasDefaultValueSql("CURRENT_TIMESTAMP");
        usuario.HasIndex(u => u.Email).IsUnique().HasDatabaseName("Usuario_email_key");
        usuario.HasIndex(u => u.Rol).HasDatabaseName("Usuario_rol_idx");

        var complejo = modelBuilder.Entity<Complejo>();
        complejo.ToTable("Complejo").HasKey(c => c.Id).HasName("Complejo_pkey");
        complejo.Property(c => c.Id).HasColumnName("id");
        complejo.Property(c => c.Nombre).HasColumnName("nombre");
        complejo.Property(c => c.Descripcion).HasColumnName("descripcion");
        complejo.Property(c => c.Direccion).HasColumnName("direccion");
        complejo.Property(c => c.Distrito).HasColumnName("distrito");
        complejo.Property(c => c.Ciudad).HasColumnName("ciudad");
        complejo.Property(c => c.Telefono).HasColumnName("telefono");
        complejo.Property(c => c.Email).HasColumnName("email");
        complejo.Property(c => c.Slug).HasColumnName("slug");
        complejo.Property(c => c.Publicado).HasColumnName("publicado").HasDefaultValue(false);
        complejo.Property(c => c.DuenoId).HasColumnName("duenoId");
        complejo.Property(c => c.CreadoEn).HasColumnName("creadoEn")
            .HasColumnType("timestamp(3) without time zone").HasDefaultValueSql("CURRENT_TIMESTAMP");
        complejo.Property(c => c.ActualizadoEn).HasColumnName("actualizadoEn")
            .HasColumnType("timestamp(3) without time zone").HasDefaultValueSql("CURRENT_TIMESTAMP");
        complejo.HasIndex(c => c.Slug).IsUnique().HasDatabaseName("Complejo_slug_key");
        complejo.HasIndex(c => c.DuenoId).HasDatabaseName("Complejo_duenoId_idx");
        complejo.HasIndex(c => c.Publicado).HasDatabaseName("Complejo_publicado_idx");
        complejo.HasIndex(c => c.Distrito).HasDatabaseName("Complejo_distrito_idx");
        complejo.HasOne(c => c.Dueno).WithMany(u => u.ComplejosPropios)
            .HasForeignKey(c => c.DuenoId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("Complejo_duenoId_fkey");

        var miembro = modelBuilder.Entity<ComplejoMiembro>();
        miembro.ToTable("ComplejoMiembro").HasKey(m => m.Id).HasName("ComplejoMiembro_pkey");
        miembro.Property(m => m.Id).HasColumnName("id");
        miembro.Property(m => m.UsuarioId).HasColumnName("usuarioId");
        miembro.Property(m => m.ComplejoId).HasColumnName("complejoId");
        miembro.Property(m => m.RolSede).HasColumnName("rolSede");
        miembro.Property(m => m.Activo).HasColumnName("activo").HasDefaultValue(true);
        miembro.Property(m => m.CreadoEn).HasColumnName("creadoEn")
            .HasColumnType("timestamp(3) without time zone").HasDefaultValueSql("CURRENT_TIMESTAMP");
        miembro.HasIndex(m => new { m.UsuarioId, m.ComplejoId }).IsUnique().HasDatabaseName("ComplejoMiembro_usuarioId_complejoId_key");
        miembro.HasIndex(m => m.ComplejoId).HasDatabaseName("ComplejoMiembro_complejoId_idx");

        var cancha = modelBuilder.Entity<Cancha>();
        cancha.ToTable("Cancha").HasKey(c => c.Id).HasName("Cancha_pkey");
        cancha.Property(c => c.Id).HasColumnName("id");
        cancha.Property(c => c.Nombre).HasColumnName("nombre");
        cancha.Property(c => c.Tipo).HasColumnName("tipo");
        cancha.Property(c => c.Descripcion).HasColumnName("descripcion");
        cancha.Property(c => c.PrecioPorHora).HasColumnName("precioPorHora").HasPrecision(10, 2);
        cancha.Property(c => c.Capacidad).HasColumnName("capacidad");
        cancha.Property(c => c.Techada).HasColumnName("techada").HasDefaultValue(false);
        cancha.Property(c => c.Superficie).HasColumnName("superficie");
        cancha.Property(c => c.Activa).HasColumnName("activa").HasDefaultValue(true);
        cancha.Property(c => c.Imagen).HasColumnName("imagen");
        cancha.Property(c => c.ComplejoId).HasColumnName("complejoId");
        cancha.Property(c => c.CreadoEn).HasColumnName("creadoEn")
            .HasColumnType("timestamp(3) without time zone").HasDefaultValueSql("CURRENT_TIMESTAMP");
        cancha.HasIndex(c => c.Tipo).HasDatabaseName("Cancha_tipo_idx");
        cancha.HasIndex(c => c.Activa).HasDatabaseName("Cancha_activa_idx");
        cancha.HasIndex(c => c.ComplejoId).HasDatabaseName("Cancha_complejoId_idx");
        cancha.HasOne(c => c.Complejo).WithMany(x => x.Canchas)
            .HasForeignKey(c => c.ComplejoId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("Cancha_complejoId_fkey");

        var reserva = modelBuilder.Entity<Reserva>();
        reserva.ToTable("Reserva").HasKey(r => r.Id).HasName("Reserva_pkey");
        reserva.Property(r => r.Id).HasColumnName("id");
        reserva.Property(r => r.Codigo).HasColumnName("codigo");
        reserva.Property(r => r.UsuarioId).HasColumnName("usuarioId");
        reserva.Property(r => r.CanchaId).HasColumnName("canchaId");
        reserva.Property(r => r.ComplejoId).HasColumnName("complejoId");
        reserva.Property(r => r.Fecha).HasColumnName("fecha").HasColumnType("date");
        reserva.Property(r => r.HoraInicio).HasColumnName("horaInicio");
        reserva.Property(r => r.HoraFin).HasColumnName("horaFin");
        reserva.Property(r => r.Estado).HasColumnName("estado").HasDefaultValue(EstadoReserva.PENDIENTE);
        reserva.Property(r => r.EstadoPago).HasColumnName("estadoPago").HasDefaultValue(EstadoPago.PENDIENTE);
        reserva.Property(r => r.MetodoPago).HasColumnName("metodoPago");
        reserva.Property(r => r.Total).HasColumnName("total").HasPrecision(10, 2);
        reserva.Property(r => r.MontoPagado).HasColumnName("montoPagado").HasPrecision(10, 2).HasDefaultValue(0);
        reserva.Property(r => r.PromocionId).HasColumnName("promocionId");
        reserva.Property(r => r.Notas).HasColumnName("notas");
        reserva.Property(r => r.ValidadaEn).HasColumnName("validadaEn").HasColumnType("timestamp(3) without time zone");
        reserva.Property(r => r.ValidadaPorId).HasColumnName("validadaPorId");
        reserva.Property(r => r.CreadoEn).HasColumnName("creadoEn")
            .HasColumnType("timestamp(3) without time zone").HasDefaultValueSql("CURRENT_TIMESTAMP");
        reserva.HasIndex(r => r.Codigo).IsUnique().HasDatabaseName("Reserva_codigo_idx");
        reserva.HasIndex(r => new { r.CanchaId, r.Fecha }).HasDatabaseName("Reserva_canchaId_fecha_idx");
        reserva.HasIndex(r => new { r.ComplejoId, r.Fecha }).HasDatabaseName("Reserva_complejoId_fecha_idx");
        reserva.HasIndex(r => r.UsuarioId).HasDatabaseName("Reserva_usuarioId_idx");
        reserva.HasIndex(r => r.Estado).HasDatabaseName("Reserva_estado_idx");
        reserva.HasOne(r => r.Usuario)
            .WithMany(u => u.Reservas)
            .HasForeignKey(r => r.UsuarioId)
            .OnDelete(DeleteBehavior.Restrict).HasConstraintName("Reserva_usuarioId_fkey");
        reserva.HasOne(r => r.Cancha)
            .WithMany(c => c.Reservas)
            .HasForeignKey(r => r.CanchaId)
            .OnDelete(DeleteBehavior.Restrict).HasConstraintName("Reserva_canchaId_fkey");
        reserva.HasOne(r => r.Complejo)
            .WithMany(c => c.Reservas)
            .HasForeignKey(r => r.ComplejoId)
            .OnDelete(DeleteBehavior.Restrict).HasConstraintName("Reserva_complejoId_fkey");

        var producto = modelBuilder.Entity<Producto>();
        producto.ToTable("Producto").HasKey(p => p.Id).HasName("Producto_pkey");
        producto.Property(p => p.Id).HasColumnName("id");
        producto.Property(p => p.ComplejoId).HasColumnName("complejoId");
        producto.Property(p => p.Nombre).HasColumnName("nombre");
        producto.Property(p => p.Categoria).HasColumnName("categoria");
        producto.Property(p => p.Precio).HasColumnName("precio").HasPrecision(10, 2);
        producto.Property(p => p.Stock).HasColumnName("stock");
        producto.Property(p => p.Activo).HasColumnName("activo").HasDefaultValue(true);
        producto.HasIndex(p => new { p.ComplejoId, p.Activo }).HasDatabaseName("Producto_complejoId_activo_idx");
        producto.HasOne(p => p.Complejo).WithMany(c => c.Productos)
            .HasForeignKey(p => p.ComplejoId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("Producto_complejoId_fkey");

        var caja = modelBuilder.Entity<CajaSesion>();
        caja.ToTable("CajaSesion").HasKey(c => c.Id).HasName("CajaSesion_pkey");
        caja.Property(c => c.Id).HasColumnName("id");
        caja.Property(c => c.ComplejoId).HasColumnName("complejoId");
        caja.Property(c => c.AbiertaPorId).HasColumnName("abiertaPorId");
        caja.Property(c => c.CerradaPorId).HasColumnName("cerradaPorId");
        caja.Property(c => c.MontoInicial).HasColumnName("montoInicial").HasPrecision(10, 2);
        caja.Property(c => c.MontoFinal).HasColumnName("montoFinal").HasPrecision(10, 2);
        caja.Property(c => c.Estado).HasColumnName("estado").HasDefaultValue(EstadoCaja.ABIERTA);
        caja.Property(c => c.AbiertaEn).HasColumnName("abiertaEn")
            .HasColumnType("timestamp(3) without time zone").HasDefaultValueSql("CURRENT_TIMESTAMP");
        caja.Property(c => c.CerradaEn).HasColumnName("cerradaEn").HasColumnType("timestamp(3) without time zone");
        caja.HasIndex(c => new { c.ComplejoId, c.Estado }).HasDatabaseName("CajaSesion_complejoId_estado_idx");
        caja.HasOne(c => c.Complejo).WithMany(x => x.Cajas)
            .HasForeignKey(c => c.ComplejoId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("CajaSesion_complejoId_fkey");

        var mov = modelBuilder.Entity<MovimientoCaja>();
        mov.ToTable("MovimientoCaja").HasKey(m => m.Id).HasName("MovimientoCaja_pkey");
        mov.Property(m => m.Id).HasColumnName("id");
        mov.Property(m => m.ComplejoId).HasColumnName("complejoId");
        mov.Property(m => m.CajaId).HasColumnName("cajaId");
        mov.Property(m => m.Tipo).HasColumnName("tipo");
        mov.Property(m => m.MetodoPago).HasColumnName("metodoPago").HasDefaultValue(MetodoPago.EFECTIVO);
        mov.Property(m => m.Monto).HasColumnName("monto").HasPrecision(10, 2);
        mov.Property(m => m.Descripcion).HasColumnName("descripcion");
        mov.Property(m => m.CreadoPorId).HasColumnName("creadoPorId");
        mov.Property(m => m.ReservaId).HasColumnName("reservaId");
        mov.Property(m => m.ProductoId).HasColumnName("productoId");
        mov.Property(m => m.CreadoEn).HasColumnName("creadoEn")
            .HasColumnType("timestamp(3) without time zone").HasDefaultValueSql("CURRENT_TIMESTAMP");
        mov.HasIndex(m => m.CajaId).HasDatabaseName("MovimientoCaja_cajaId_idx");
        mov.HasIndex(m => new { m.ComplejoId, m.CreadoEn }).HasDatabaseName("MovimientoCaja_complejoId_creadoEn_idx");
        mov.HasIndex(m => m.Tipo).HasDatabaseName("MovimientoCaja_tipo_idx");
        mov.HasOne(m => m.Caja).WithMany(c => c.Movimientos)
            .HasForeignKey(m => m.CajaId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("MovimientoCaja_cajaId_fkey");
        // Sin este mapeo, EF crea la sombra MovimientoCaja.UsuarioId (columna
        // inexistente) y revienta TODO query de movimientos (caja/hoy 500).
        mov.HasOne<Usuario>().WithMany(u => u.MovimientosCreados)
            .HasForeignKey(m => m.CreadoPorId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("MovimientoCaja_creadoPorId_fkey");

        var promo = modelBuilder.Entity<Promocion>();
        promo.ToTable("Promocion").HasKey(p => p.Id).HasName("Promocion_pkey");
        promo.Property(p => p.Id).HasColumnName("id");
        promo.Property(p => p.ComplejoId).HasColumnName("complejoId");
        promo.Property(p => p.CanchaId).HasColumnName("canchaId");
        promo.Property(p => p.Nombre).HasColumnName("nombre");
        promo.Property(p => p.Descripcion).HasColumnName("descripcion");
        promo.Property(p => p.Tipo).HasColumnName("tipo");
        promo.Property(p => p.Valor).HasColumnName("valor").HasPrecision(10, 2);
        promo.Property(p => p.HoraDesde).HasColumnName("horaDesde");
        promo.Property(p => p.HoraHasta).HasColumnName("horaHasta");
        promo.Property(p => p.DiasSemana).HasColumnName("diasSemana");
        promo.Property(p => p.FechaInicio).HasColumnName("fechaInicio").HasColumnType("date");
        promo.Property(p => p.FechaFin).HasColumnName("fechaFin").HasColumnType("date");
        promo.Property(p => p.PrecioDia).HasColumnName("precioDia").HasPrecision(10, 2);
        promo.Property(p => p.PrecioTarde).HasColumnName("precioTarde").HasPrecision(10, 2);
        promo.Property(p => p.PrecioNoche).HasColumnName("precioNoche").HasPrecision(10, 2);
        promo.Property(p => p.InicioTarde).HasColumnName("inicioTarde");
        promo.Property(p => p.InicioNoche).HasColumnName("inicioNoche");
        promo.Property(p => p.RepetirAnual).HasColumnName("repetirAnual").HasDefaultValue(false);
        promo.Property(p => p.Codigo).HasColumnName("codigo");
        promo.Property(p => p.UsosMax).HasColumnName("usosMax");
        promo.Property(p => p.UsosActuales).HasColumnName("usosActuales").HasDefaultValue(0);
        promo.Property(p => p.Activa).HasColumnName("activa").HasDefaultValue(true);
        promo.Property(p => p.CreadoEn).HasColumnName("creadoEn")
            .HasColumnType("timestamp(3) without time zone").HasDefaultValueSql("CURRENT_TIMESTAMP");
        promo.HasIndex(p => new { p.ComplejoId, p.Activa }).HasDatabaseName("Promocion_complejoId_activa_idx");
        promo.HasIndex(p => p.Codigo).IsUnique().HasDatabaseName("Promocion_codigo_key");
        promo.HasOne(p => p.Complejo).WithMany(c => c.Promociones)
            .HasForeignKey(p => p.ComplejoId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("Promocion_complejoId_fkey");

        var resena = modelBuilder.Entity<Resena>();
        resena.ToTable("Resena").HasKey(r => r.Id).HasName("Resena_pkey");
        resena.Property(r => r.Id).HasColumnName("id");
        resena.Property(r => r.ComplejoId).HasColumnName("complejoId");
        resena.Property(r => r.UsuarioId).HasColumnName("usuarioId");
        resena.Property(r => r.Puntuacion).HasColumnName("puntuacion");
        resena.Property(r => r.Comentario).HasColumnName("comentario");
        resena.Property(r => r.RespuestaDueno).HasColumnName("respuestaDueno");
        resena.Property(r => r.CreadoEn).HasColumnName("creadoEn")
            .HasColumnType("timestamp(3) without time zone").HasDefaultValueSql("CURRENT_TIMESTAMP");
        resena.HasIndex(r => r.ComplejoId).HasDatabaseName("Resena_complejoId_idx");
        resena.HasIndex(r => new { r.ComplejoId, r.UsuarioId }).IsUnique().HasDatabaseName("Resena_complejoId_usuarioId_key");
        resena.HasOne(r => r.Complejo).WithMany(c => c.Resenas)
            .HasForeignKey(r => r.ComplejoId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("Resena_complejoId_fkey");
        resena.HasOne(r => r.Usuario).WithMany(u => u.Resenas)
            .HasForeignKey(r => r.UsuarioId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("Resena_usuarioId_fkey");

        var torneo = modelBuilder.Entity<Torneo>();
        torneo.ToTable("Torneo").HasKey(t => t.Id).HasName("Torneo_pkey");
        torneo.Property(t => t.Id).HasColumnName("id");
        torneo.Property(t => t.ComplejoId).HasColumnName("complejoId");
        torneo.Property(t => t.Nombre).HasColumnName("nombre");
        torneo.Property(t => t.Deporte).HasColumnName("deporte");
        torneo.Property(t => t.FechaInicio).HasColumnName("fechaInicio").HasColumnType("date");
        torneo.Property(t => t.FechaFin).HasColumnName("fechaFin").HasColumnType("date");
        torneo.Property(t => t.CostoInscripcion).HasColumnName("costoInscripcion").HasPrecision(10, 2);
        torneo.Property(t => t.CupoMax).HasColumnName("cupoMax").HasDefaultValue(16);
        torneo.Property(t => t.Premio).HasColumnName("premio");
        torneo.Property(t => t.Reglamento).HasColumnName("reglamento");
        torneo.Property(t => t.Estado).HasColumnName("estado").HasDefaultValue(EstadoTorneo.BORRADOR);
        torneo.Property(t => t.CreadoEn).HasColumnName("creadoEn")
            .HasColumnType("timestamp(3) without time zone").HasDefaultValueSql("CURRENT_TIMESTAMP");
        torneo.HasIndex(t => new { t.ComplejoId, t.Estado }).HasDatabaseName("Torneo_complejoId_estado_idx");
        torneo.HasOne(t => t.Complejo).WithMany(c => c.Torneos)
            .HasForeignKey(t => t.ComplejoId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("Torneo_complejoId_fkey");

        var insc = modelBuilder.Entity<InscripcionTorneo>();
        insc.ToTable("InscripcionTorneo").HasKey(i => i.Id).HasName("InscripcionTorneo_pkey");
        insc.Property(i => i.Id).HasColumnName("id");
        insc.Property(i => i.TorneoId).HasColumnName("torneoId");
        insc.Property(i => i.Equipo).HasColumnName("equipo");
        insc.Property(i => i.CapitanId).HasColumnName("capitanId");
        insc.Property(i => i.Telefono).HasColumnName("telefono");
        insc.Property(i => i.Pagado).HasColumnName("pagado").HasDefaultValue(false);
        insc.Property(i => i.CreadoEn).HasColumnName("creadoEn")
            .HasColumnType("timestamp(3) without time zone").HasDefaultValueSql("CURRENT_TIMESTAMP");
        insc.HasIndex(i => i.TorneoId).HasDatabaseName("InscripcionTorneo_torneoId_idx");
        insc.HasIndex(i => new { i.TorneoId, i.Equipo }).IsUnique().HasDatabaseName("InscripcionTorneo_torneoId_equipo_key");
        insc.HasOne(i => i.Torneo).WithMany(t => t.Inscripciones)
            .HasForeignKey(i => i.TorneoId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("InscripcionTorneo_torneoId_fkey");

        var partido = modelBuilder.Entity<PartidoTorneo>();
        partido.ToTable("PartidoTorneo").HasKey(p => p.Id).HasName("PartidoTorneo_pkey");
        partido.Property(p => p.Id).HasColumnName("id");
        partido.Property(p => p.TorneoId).HasColumnName("torneoId");
        partido.Property(p => p.Fase).HasColumnName("fase");
        partido.Property(p => p.EquipoA).HasColumnName("equipoA");
        partido.Property(p => p.EquipoB).HasColumnName("equipoB");
        partido.Property(p => p.GolesA).HasColumnName("golesA");
        partido.Property(p => p.GolesB).HasColumnName("golesB");
        partido.Property(p => p.Fecha).HasColumnName("fecha").HasColumnType("timestamp(3) without time zone");
        partido.Property(p => p.CanchaId).HasColumnName("canchaId");
        partido.Property(p => p.Ganador).HasColumnName("ganador");
        partido.HasIndex(p => new { p.TorneoId, p.Fase }).HasDatabaseName("PartidoTorneo_torneoId_fase_idx");
        partido.HasOne(p => p.Torneo).WithMany(t => t.Partidos)
            .HasForeignKey(p => p.TorneoId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("PartidoTorneo_torneoId_fkey");

        var meta = modelBuilder.Entity<Meta>();
        meta.ToTable("Meta").HasKey(m => m.Id).HasName("Meta_pkey");
        meta.Property(m => m.Id).HasColumnName("id");
        meta.Property(m => m.ComplejoId).HasColumnName("complejoId");
        meta.Property(m => m.Titulo).HasColumnName("titulo");
        meta.Property(m => m.Tipo).HasColumnName("tipo");
        meta.Property(m => m.Objetivo).HasColumnName("objetivo").HasPrecision(12, 2);
        meta.Property(m => m.Actual).HasColumnName("actual").HasPrecision(12, 2).HasDefaultValue(0);
        meta.Property(m => m.PeriodoInicio).HasColumnName("periodoInicio").HasColumnType("date");
        meta.Property(m => m.PeriodoFin).HasColumnName("periodoFin").HasColumnType("date");
        meta.HasIndex(m => m.ComplejoId).HasDatabaseName("Meta_complejoId_idx");
        meta.HasOne(m => m.Complejo).WithMany(c => c.Metas)
            .HasForeignKey(m => m.ComplejoId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("Meta_complejoId_fkey");

        var sub = modelBuilder.Entity<Suscripcion>();
        sub.ToTable("Suscripcion").HasKey(s => s.Id).HasName("Suscripcion_pkey");
        sub.Property(s => s.Id).HasColumnName("id");
        sub.Property(s => s.ComplejoId).HasColumnName("complejoId");
        sub.Property(s => s.Plan).HasColumnName("plan");
        sub.Property(s => s.Estado).HasColumnName("estado");
        sub.Property(s => s.FechaInicio).HasColumnName("fechaInicio").HasColumnType("date");
        sub.Property(s => s.FechaFin).HasColumnName("fechaFin").HasColumnType("date");
        sub.Property(s => s.CreadoEn).HasColumnName("creadoEn")
            .HasColumnType("timestamp(3) without time zone").HasDefaultValueSql("CURRENT_TIMESTAMP");
        sub.HasIndex(s => s.ComplejoId).HasDatabaseName("Suscripcion_complejoId_idx");
        sub.HasOne(s => s.Complejo).WithMany(c => c.Suscripciones)
            .HasForeignKey(s => s.ComplejoId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("Suscripcion_complejoId_fkey");

        var san = modelBuilder.Entity<Sancion>();
        san.ToTable("Sancion").HasKey(s => s.Id).HasName("Sancion_pkey");
        san.Property(s => s.Id).HasColumnName("id");
        san.Property(s => s.ComplejoId).HasColumnName("complejoId");
        san.Property(s => s.UsuarioId).HasColumnName("usuarioId");
        san.Property(s => s.Nivel).HasColumnName("nivel");
        san.Property(s => s.Motivo).HasColumnName("motivo");
        san.Property(s => s.Activa).HasColumnName("activa").HasDefaultValue(true);
        san.Property(s => s.CreadoPorId).HasColumnName("creadoPorId");
        san.Property(s => s.CreadoEn).HasColumnName("creadoEn")
            .HasColumnType("timestamp(3) without time zone").HasDefaultValueSql("CURRENT_TIMESTAMP");
        san.HasIndex(s => s.ComplejoId).HasDatabaseName("Sancion_complejoId_idx");
        san.HasIndex(s => s.UsuarioId).HasDatabaseName("Sancion_usuarioId_idx");
        san.HasOne(s => s.Complejo).WithMany(c => c.Sanciones)
            .HasForeignKey(s => s.ComplejoId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("Sancion_complejoId_fkey");
        san.HasOne(s => s.Usuario).WithMany(u => u.SancionesRecibidas)
            .HasForeignKey(s => s.UsuarioId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("Sancion_usuarioId_fkey");

        var hor = modelBuilder.Entity<HorarioOperativo>();
        hor.ToTable("Horario").HasKey(h => h.Id).HasName("Horario_pkey");
        hor.Property(h => h.Id).HasColumnName("id");
        hor.Property(h => h.ComplejoId).HasColumnName("complejoId");
        hor.Property(h => h.CanchaId).HasColumnName("canchaId");
        hor.Property(h => h.DiaSemana).HasColumnName("diaSemana");
        hor.Property(h => h.AperturaMin).HasColumnName("aperturaMin");
        hor.Property(h => h.CierreMin).HasColumnName("cierreMin");
        hor.Property(h => h.Activo).HasColumnName("activo").HasDefaultValue(true);
        hor.Property(h => h.CreadoEn).HasColumnName("creadoEn")
            .HasColumnType("timestamp(3) without time zone").HasDefaultValueSql("CURRENT_TIMESTAMP");
        hor.HasIndex(h => h.ComplejoId).HasDatabaseName("Horario_complejoId_idx");
        hor.HasIndex(h => new { h.ComplejoId, h.CanchaId, h.DiaSemana }).HasDatabaseName("Horario_alcance_dia_idx");
        hor.HasOne(h => h.Complejo).WithMany(c => c.Horarios)
            .HasForeignKey(h => h.ComplejoId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("Horario_complejoId_fkey");
    }
}
