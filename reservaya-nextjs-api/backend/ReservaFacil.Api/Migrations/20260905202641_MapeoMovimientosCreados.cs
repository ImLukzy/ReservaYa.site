using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ReservaFacil.Api.Migrations
{
    /// <inheritdoc />
    public partial class MapeoMovimientosCreados : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Sin DDL: el FK real MovimientoCaja_creadoPorId_fkey ya existe en vivo.
            // Esta migracion solo registra en el snapshot que MovimientosCreados usa
            // CreadoPorId, eliminando la sombra MovimientoCaja.UsuarioId (columna
            // inexistente que tumbaba todo query de movimientos con 42703).
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
