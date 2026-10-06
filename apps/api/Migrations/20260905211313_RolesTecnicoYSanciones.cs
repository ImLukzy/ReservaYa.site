using System;
using Microsoft.EntityFrameworkCore.Migrations;
using ReservaFacil.Api.Models;

#nullable disable

namespace ReservaFacil.Api.Migrations
{
    /// <inheritdoc />
    public partial class RolesTecnicoYSanciones : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Solo el tipo nuevo: los labels TECNICO/PENDIENTE/RECHAZADA ya se
            // agregaron en mayúsculas por SQL (EF los generaría en minúsculas
            // y chocarían con los existentes: 42710).
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:public.NivelSancion", "ADVERTENCIA,BLOQUEO");

            migrationBuilder.AlterColumn<EstadoSuscripcion>(
                name: "estado",
                table: "Suscripcion",
                type: "public.\"EstadoSuscripcion\"",
                nullable: false,
                oldClrType: typeof(EstadoSuscripcion),
                oldType: "public.\"EstadoSuscripcion\"",
                oldDefaultValue: EstadoSuscripcion.ACTIVA);

            migrationBuilder.CreateTable(
                name: "Sancion",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    complejoId = table.Column<string>(type: "text", nullable: false),
                    usuarioId = table.Column<string>(type: "text", nullable: false),
                    nivel = table.Column<NivelSancion>(type: "public.\"NivelSancion\"", nullable: false),
                    motivo = table.Column<string>(type: "text", nullable: false),
                    activa = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    creadoPorId = table.Column<string>(type: "text", nullable: false),
                    creadoEn = table.Column<DateTime>(type: "timestamp(3) without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("Sancion_pkey", x => x.id);
                    table.ForeignKey(
                        name: "Sancion_complejoId_fkey",
                        column: x => x.complejoId,
                        principalTable: "Complejo",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "Sancion_usuarioId_fkey",
                        column: x => x.usuarioId,
                        principalTable: "Usuario",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "Sancion_complejoId_idx",
                table: "Sancion",
                column: "complejoId");

            migrationBuilder.CreateIndex(
                name: "Sancion_usuarioId_idx",
                table: "Sancion",
                column: "usuarioId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Sancion");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:public.EstadoCaja", "abierta,cerrada")
                .Annotation("Npgsql:Enum:public.EstadoPago", "pendiente,pagado,parcial,reembolsado")
                .Annotation("Npgsql:Enum:public.EstadoReserva", "pendiente,confirmada,cancelada,completada")
                .Annotation("Npgsql:Enum:public.EstadoSuscripcion", "ACTIVA,VENCIDA,CANCELADA")
                .Annotation("Npgsql:Enum:public.EstadoTorneo", "borrador,inscripciones_abiertas,en_curso,finalizado,cancelado")
                .Annotation("Npgsql:Enum:public.MetodoPago", "efectivo,yape,culqi,tarjeta,transferencia")
                .Annotation("Npgsql:Enum:public.Rol", "usuario,personal,admin,superadmin")
                .Annotation("Npgsql:Enum:public.TipoCancha", "futbol,futbol5,futbol7,padel,tenis,basquet,volleyball,loza")
                .Annotation("Npgsql:Enum:public.TipoDescuento", "porcentaje,monto_fijo,precio_especial")
                .Annotation("Npgsql:Enum:public.TipoMeta", "ingresos,ocupacion,reservas")
                .Annotation("Npgsql:Enum:public.TipoMovimiento", "reserva,snack,alquiler,abono,egreso,ajuste")
                .Annotation("Npgsql:Enum:public.TipoPlan", "MENSUAL,TRIMESTRAL,ANUAL")
                .OldAnnotation("Npgsql:Enum:public.EstadoCaja", "abierta,cerrada")
                .OldAnnotation("Npgsql:Enum:public.EstadoPago", "pendiente,pagado,parcial,reembolsado")
                .OldAnnotation("Npgsql:Enum:public.EstadoReserva", "pendiente,confirmada,cancelada,completada")
                .OldAnnotation("Npgsql:Enum:public.EstadoSuscripcion", "PENDIENTE,ACTIVA,VENCIDA,CANCELADA,RECHAZADA")
                .OldAnnotation("Npgsql:Enum:public.EstadoTorneo", "borrador,inscripciones_abiertas,en_curso,finalizado,cancelado")
                .OldAnnotation("Npgsql:Enum:public.MetodoPago", "efectivo,yape,culqi,tarjeta,transferencia")
                .OldAnnotation("Npgsql:Enum:public.NivelSancion", "ADVERTENCIA,BLOQUEO")
                .OldAnnotation("Npgsql:Enum:public.Rol", "usuario,personal,admin,superadmin,tecnico")
                .OldAnnotation("Npgsql:Enum:public.TipoCancha", "futbol,futbol5,futbol7,padel,tenis,basquet,volleyball,loza")
                .OldAnnotation("Npgsql:Enum:public.TipoDescuento", "porcentaje,monto_fijo,precio_especial")
                .OldAnnotation("Npgsql:Enum:public.TipoMeta", "ingresos,ocupacion,reservas")
                .OldAnnotation("Npgsql:Enum:public.TipoMovimiento", "reserva,snack,alquiler,abono,egreso,ajuste")
                .OldAnnotation("Npgsql:Enum:public.TipoPlan", "MENSUAL,TRIMESTRAL,ANUAL");

            migrationBuilder.AlterColumn<EstadoSuscripcion>(
                name: "estado",
                table: "Suscripcion",
                type: "public.\"EstadoSuscripcion\"",
                nullable: false,
                defaultValue: EstadoSuscripcion.ACTIVA,
                oldClrType: typeof(EstadoSuscripcion),
                oldType: "public.\"EstadoSuscripcion\"");
        }
    }
}
