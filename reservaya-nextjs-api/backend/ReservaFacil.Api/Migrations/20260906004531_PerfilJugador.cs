using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ReservaFacil.Api.Migrations
{
    /// <inheritdoc />
    public partial class PerfilJugador : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "fechaNacimiento",
                table: "Usuario",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "username",
                table: "Usuario",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "usernameCambiadoEn",
                table: "Usuario",
                type: "timestamp(3) without time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "Usuario_username_key",
                table: "Usuario",
                column: "username",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "Usuario_username_key",
                table: "Usuario");

            migrationBuilder.DropColumn(
                name: "fechaNacimiento",
                table: "Usuario");

            migrationBuilder.DropColumn(
                name: "username",
                table: "Usuario");

            migrationBuilder.DropColumn(
                name: "usernameCambiadoEn",
                table: "Usuario");
        }
    }
}
