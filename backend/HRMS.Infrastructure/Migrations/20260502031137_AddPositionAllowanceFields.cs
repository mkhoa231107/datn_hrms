using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HRMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPositionAllowanceFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "DefaultPositionAllowance",
                table: "Positions",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "DefaultResponsibilityAllowance",
                table: "Positions",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "DefaultSeniorityAllowance",
                table: "Positions",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DefaultPositionAllowance",
                table: "Positions");

            migrationBuilder.DropColumn(
                name: "DefaultResponsibilityAllowance",
                table: "Positions");

            migrationBuilder.DropColumn(
                name: "DefaultSeniorityAllowance",
                table: "Positions");
        }
    }
}
