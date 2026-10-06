using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ReservaFacil.Api.Migrations
{
    /// <inheritdoc />
    public partial class Baseline : Migration
    {
        // Baseline intencionalmente vacio: la base Neon ya converge con el
        // modelo (verificado con db:check + migrate diff = 0). Esta migracion
        // solo registra el punto de partida en __EFMigrationsHistory para que
        // EF detecte cambios futuros. NO agrega operaciones aquí.
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}