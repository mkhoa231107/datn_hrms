using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HRMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RefactorShiftLeaderToTeamLeader : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WorkSchedules_Employees_ShiftLeaderId",
                table: "WorkSchedules");

            migrationBuilder.RenameColumn(
                name: "ShiftLeaderId",
                table: "WorkSchedules",
                newName: "TeamLeaderId");

            migrationBuilder.RenameIndex(
                name: "IX_WorkSchedules_ShiftLeaderId",
                table: "WorkSchedules",
                newName: "IX_WorkSchedules_TeamLeaderId");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkSchedules_Employees_TeamLeaderId",
                table: "WorkSchedules",
                column: "TeamLeaderId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WorkSchedules_Employees_TeamLeaderId",
                table: "WorkSchedules");

            migrationBuilder.RenameColumn(
                name: "TeamLeaderId",
                table: "WorkSchedules",
                newName: "ShiftLeaderId");

            migrationBuilder.RenameIndex(
                name: "IX_WorkSchedules_TeamLeaderId",
                table: "WorkSchedules",
                newName: "IX_WorkSchedules_ShiftLeaderId");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkSchedules_Employees_ShiftLeaderId",
                table: "WorkSchedules",
                column: "ShiftLeaderId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
