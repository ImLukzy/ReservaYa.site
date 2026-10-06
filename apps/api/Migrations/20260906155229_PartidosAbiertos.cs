using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ReservaFacil.Api.Migrations
{
    /// <inheritdoc />
    public partial class PartidosAbiertos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PartidoAbierto",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    organizadorId = table.Column<string>(type: "text", nullable: false),
                    titulo = table.Column<string>(type: "text", nullable: false),
                    descripcion = table.Column<string>(type: "text", nullable: true),
                    formato = table.Column<string>(type: "text", nullable: false),
                    nivel = table.Column<string>(type: "text", nullable: false),
                    cuposTotales = table.Column<int>(type: "integer", nullable: false),
                    distrito = table.Column<string>(type: "text", nullable: false),
                    cancha = table.Column<string>(type: "text", nullable: false),
                    superficie = table.Column<string>(type: "text", nullable: true),
                    precio = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    fecha = table.Column<DateTime>(type: "date", nullable: false),
                    desdeMin = table.Column<int>(type: "integer", nullable: false),
                    hastaMin = table.Column<int>(type: "integer", nullable: false),
                    fotoUrl = table.Column<string>(type: "text", nullable: true),
                    creadoEn = table.Column<DateTime>(type: "timestamp(3) without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PartidoAbierto_pkey", x => x.id);
                    table.ForeignKey(
                        name: "PartidoAbierto_organizadorId_fkey",
                        column: x => x.organizadorId,
                        principalTable: "Usuario",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AnotacionPartido",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    partidoId = table.Column<string>(type: "text", nullable: false),
                    usuarioId = table.Column<string>(type: "text", nullable: false),
                    creadoEn = table.Column<DateTime>(type: "timestamp(3) without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("AnotacionPartido_pkey", x => x.id);
                    table.ForeignKey(
                        name: "AnotacionPartido_partidoId_fkey",
                        column: x => x.partidoId,
                        principalTable: "PartidoAbierto",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "AnotacionPartido_usuarioId_fkey",
                        column: x => x.usuarioId,
                        principalTable: "Usuario",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "AnotacionPartido_partidoId_idx",
                table: "AnotacionPartido",
                column: "partidoId");

            migrationBuilder.CreateIndex(
                name: "AnotacionPartido_partidoId_usuarioId_key",
                table: "AnotacionPartido",
                columns: new[] { "partidoId", "usuarioId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AnotacionPartido_usuarioId",
                table: "AnotacionPartido",
                column: "usuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_PartidoAbierto_organizadorId",
                table: "PartidoAbierto",
                column: "organizadorId");

            migrationBuilder.CreateIndex(
                name: "PartidoAbierto_distrito_idx",
                table: "PartidoAbierto",
                column: "distrito");

            migrationBuilder.CreateIndex(
                name: "PartidoAbierto_fecha_idx",
                table: "PartidoAbierto",
                column: "fecha");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AnotacionPartido");

            migrationBuilder.DropTable(
                name: "PartidoAbierto");
        }
    }
}
