using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ReservaFacil.Api.Migrations
{
    /// <inheritdoc />
    public partial class GoogleLogin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "avatarUrl",
                table: "Usuario",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "googleId",
                table: "Usuario",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "Usuario_googleId_key",
                table: "Usuario",
                column: "googleId",
                unique: true,
                filter: "\"googleId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "Usuario_googleId_key",
                table: "Usuario");

            migrationBuilder.DropColumn(
                name: "avatarUrl",
                table: "Usuario");

            migrationBuilder.DropColumn(
                name: "googleId",
                table: "Usuario");
        }
    }
}
