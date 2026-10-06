using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ReservaFacil.Api.Migrations
{
    /// <inheritdoc />
    public partial class HorarioOperativo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Horario",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    complejoId = table.Column<string>(type: "text", nullable: false),
                    canchaId = table.Column<string>(type: "text", nullable: true),
                    diaSemana = table.Column<int>(type: "integer", nullable: false),
                    aperturaMin = table.Column<int>(type: "integer", nullable: false),
                    cierreMin = table.Column<int>(type: "integer", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    creadoEn = table.Column<DateTime>(type: "timestamp(3) without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("Horario_pkey", x => x.id);
                    table.ForeignKey(
                        name: "Horario_complejoId_fkey",
                        column: x => x.complejoId,
                        principalTable: "Complejo",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "Horario_alcance_dia_idx",
                table: "Horario",
                columns: new[] { "complejoId", "canchaId", "diaSemana" });

            migrationBuilder.CreateIndex(
                name: "Horario_complejoId_idx",
                table: "Horario",
                column: "complejoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Horario");
        }
    }
}
