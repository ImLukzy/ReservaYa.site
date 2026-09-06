using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using ReservaFacil.Api.Models;

#nullable disable

namespace ReservaFacil.Api.Migrations
{
    /// <inheritdoc />
    public partial class SuscripcionesYPrecios : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
                .OldAnnotation("Npgsql:Enum:public.EstadoTorneo", "borrador,inscripciones_abiertas,en_curso,finalizado,cancelado")
                .OldAnnotation("Npgsql:Enum:public.MetodoPago", "efectivo,yape,culqi,tarjeta,transferencia")
                .OldAnnotation("Npgsql:Enum:public.Rol", "usuario,personal,admin,superadmin")
                .OldAnnotation("Npgsql:Enum:public.TipoCancha", "futbol,futbol5,futbol7,padel,tenis,basquet,volleyball,loza")
                .OldAnnotation("Npgsql:Enum:public.TipoDescuento", "porcentaje,monto_fijo,precio_especial")
                .OldAnnotation("Npgsql:Enum:public.TipoMeta", "ingresos,ocupacion,reservas")
                .OldAnnotation("Npgsql:Enum:public.TipoMovimiento", "reserva,snack,alquiler,abono,egreso,ajuste");

            // diasSemana/fechaInicio/fechaFin ya existían (era Prisma): solo se
            // converge nulabilidad de diasSemana al modelo (NOT NULL, default '{}').
            migrationBuilder.Sql(
                "UPDATE \"Promocion\" SET \"diasSemana\" = '{}' WHERE \"diasSemana\" IS NULL; " +
                "ALTER TABLE \"Promocion\" ALTER COLUMN \"diasSemana\" SET NOT NULL; " +
                "ALTER TABLE \"Promocion\" ALTER COLUMN \"diasSemana\" SET DEFAULT '{}';");

            migrationBuilder.AddColumn<int>(
                name: "inicioNoche",
                table: "Promocion",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "inicioTarde",
                table: "Promocion",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "precioDia",
                table: "Promocion",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "precioNoche",
                table: "Promocion",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "precioTarde",
                table: "Promocion",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "repetirAnual",
                table: "Promocion",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "Suscripcion",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    complejoId = table.Column<string>(type: "text", nullable: false),
                    plan = table.Column<TipoPlan>(type: "public.\"TipoPlan\"", nullable: false),
                    estado = table.Column<EstadoSuscripcion>(type: "public.\"EstadoSuscripcion\"", nullable: false, defaultValue: EstadoSuscripcion.ACTIVA),
                    fechaInicio = table.Column<DateTime>(type: "date", nullable: false),
                    fechaFin = table.Column<DateTime>(type: "date", nullable: false),
                    creadoEn = table.Column<DateTime>(type: "timestamp(3) without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("Suscripcion_pkey", x => x.id);
                    table.ForeignKey(
                        name: "Suscripcion_complejoId_fkey",
                        column: x => x.complejoId,
                        principalTable: "Complejo",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "Suscripcion_complejoId_idx",
                table: "Suscripcion",
                column: "complejoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Suscripcion");

            migrationBuilder.DropColumn(
                name: "inicioNoche",
                table: "Promocion");

            migrationBuilder.DropColumn(
                name: "inicioTarde",
                table: "Promocion");

            migrationBuilder.DropColumn(
                name: "precioDia",
                table: "Promocion");

            migrationBuilder.DropColumn(
                name: "precioNoche",
                table: "Promocion");

            migrationBuilder.DropColumn(
                name: "precioTarde",
                table: "Promocion");

            migrationBuilder.DropColumn(
                name: "repetirAnual",
                table: "Promocion");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:public.EstadoCaja", "abierta,cerrada")
                .Annotation("Npgsql:Enum:public.EstadoPago", "pendiente,pagado,parcial,reembolsado")
                .Annotation("Npgsql:Enum:public.EstadoReserva", "pendiente,confirmada,cancelada,completada")
                .Annotation("Npgsql:Enum:public.EstadoTorneo", "borrador,inscripciones_abiertas,en_curso,finalizado,cancelado")
                .Annotation("Npgsql:Enum:public.MetodoPago", "efectivo,yape,culqi,tarjeta,transferencia")
                .Annotation("Npgsql:Enum:public.Rol", "usuario,personal,admin,superadmin")
                .Annotation("Npgsql:Enum:public.TipoCancha", "futbol,futbol5,futbol7,padel,tenis,basquet,volleyball,loza")
                .Annotation("Npgsql:Enum:public.TipoDescuento", "porcentaje,monto_fijo,precio_especial")
                .Annotation("Npgsql:Enum:public.TipoMeta", "ingresos,ocupacion,reservas")
                .Annotation("Npgsql:Enum:public.TipoMovimiento", "reserva,snack,alquiler,abono,egreso,ajuste")
                .OldAnnotation("Npgsql:Enum:public.EstadoCaja", "abierta,cerrada")
                .OldAnnotation("Npgsql:Enum:public.EstadoPago", "pendiente,pagado,parcial,reembolsado")
                .OldAnnotation("Npgsql:Enum:public.EstadoReserva", "pendiente,confirmada,cancelada,completada")
                .OldAnnotation("Npgsql:Enum:public.EstadoSuscripcion", "ACTIVA,VENCIDA,CANCELADA")
                .OldAnnotation("Npgsql:Enum:public.EstadoTorneo", "borrador,inscripciones_abiertas,en_curso,finalizado,cancelado")
                .OldAnnotation("Npgsql:Enum:public.MetodoPago", "efectivo,yape,culqi,tarjeta,transferencia")
                .OldAnnotation("Npgsql:Enum:public.Rol", "usuario,personal,admin,superadmin")
                .OldAnnotation("Npgsql:Enum:public.TipoCancha", "futbol,futbol5,futbol7,padel,tenis,basquet,volleyball,loza")
                .OldAnnotation("Npgsql:Enum:public.TipoDescuento", "porcentaje,monto_fijo,precio_especial")
                .OldAnnotation("Npgsql:Enum:public.TipoMeta", "ingresos,ocupacion,reservas")
                .OldAnnotation("Npgsql:Enum:public.TipoMovimiento", "reserva,snack,alquiler,abono,egreso,ajuste")
                .OldAnnotation("Npgsql:Enum:public.TipoPlan", "MENSUAL,TRIMESTRAL,ANUAL");
        }
    }
}
