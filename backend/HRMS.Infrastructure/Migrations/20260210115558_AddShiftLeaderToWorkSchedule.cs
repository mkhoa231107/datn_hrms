using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HRMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddShiftLeaderToWorkSchedule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ShiftLeaderId",
                table: "WorkSchedules",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkSchedules_ShiftLeaderId",
                table: "WorkSchedules",
                column: "ShiftLeaderId");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkSchedules_Employees_ShiftLeaderId",
                table: "WorkSchedules",
                column: "ShiftLeaderId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WorkSchedules_Employees_ShiftLeaderId",
                table: "WorkSchedules");

            migrationBuilder.DropIndex(
                name: "IX_WorkSchedules_ShiftLeaderId",
                table: "WorkSchedules");

            migrationBuilder.DropColumn(
                name: "ShiftLeaderId",
                table: "WorkSchedules");
        }
    }
}
