using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ReservaFacil.Api.Migrations
{
    /// <inheritdoc />
    public partial class LibroReclamaciones : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Reclamo",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    numero = table.Column<string>(type: "text", nullable: false),
                    anio = table.Column<int>(type: "integer", nullable: false),
                    correlativo = table.Column<int>(type: "integer", nullable: false),
                    tipo = table.Column<string>(type: "text", nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    documentoTipo = table.Column<string>(type: "text", nullable: false),
                    documento = table.Column<string>(type: "text", nullable: false),
                    domicilio = table.Column<string>(type: "text", nullable: false),
                    telefono = table.Column<string>(type: "text", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    menor = table.Column<bool>(type: "boolean", nullable: false),
                    apoderado = table.Column<string>(type: "text", nullable: true),
                    apoderadoDocumento = table.Column<string>(type: "text", nullable: true),
                    apoderadoDomicilio = table.Column<string>(type: "text", nullable: true),
                    apoderadoTelefono = table.Column<string>(type: "text", nullable: true),
                    bienTipo = table.Column<string>(type: "text", nullable: false),
                    bienDescripcion = table.Column<string>(type: "text", nullable: false),
                    monto = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    detalle = table.Column<string>(type: "text", nullable: false),
                    pedido = table.Column<string>(type: "text", nullable: false),
                    medioRespuesta = table.Column<string>(type: "text", nullable: false),
                    creadoEn = table.Column<DateTime>(type: "timestamp(3) without time zone", nullable: false),
                    estado = table.Column<string>(type: "text", nullable: true),
                    respuestaProveedor = table.Column<string>(type: "text", nullable: true),
                    respondidoEn = table.Column<DateTime>(type: "timestamp(3) without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("Reclamo_pkey", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "Reclamo_anio_correlativo_key",
                table: "Reclamo",
                columns: new[] { "anio", "correlativo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "Reclamo_numero_key",
                table: "Reclamo",
                column: "numero",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Reclamo");
        }
    }
}
