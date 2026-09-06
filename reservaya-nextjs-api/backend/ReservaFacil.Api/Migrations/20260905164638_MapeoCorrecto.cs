using Microsoft.EntityFrameworkCore.Migrations;
using ReservaFacil.Api.Models;

#nullable disable

namespace ReservaFacil.Api.Migrations
{
    /// <inheritdoc />
    public partial class MapeoCorrecto : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Limpieza real 1/2: �ndice duplicado heredado de la migraci�n manual.
            // El modelo solo declara Reserva_codigo_idx; Reserva_codigo_key sobra.
            migrationBuilder.DropIndex(
                name: "Reserva_codigo_key",
                table: "Reserva");

            // Limpieza real 2/2: el default de rolSede nunca se usa porque
            // EquipoController siempre lo fija expl�citamente (warning 20601).
            migrationBuilder.AlterColumn<Rol>(
                name: "rolSede",
                table: "ComplejoMiembro",
                type: "public.\"Rol\"",
                nullable: false,
                oldClrType: typeof(Rol),
                oldType: "public.\"Rol\"",
                oldDefaultValue: Rol.PERSONAL);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Rol>(
                name: "rolSede",
                table: "ComplejoMiembro",
                type: "public.\"Rol\"",
                nullable: false,
                defaultValue: Rol.PERSONAL,
                oldClrType: typeof(Rol),
                oldType: "public.\"Rol\"");
            // Nota: no se recrea Reserva_codigo_key (era un duplicado de Reserva_codigo_idx).
        }
    }
}
