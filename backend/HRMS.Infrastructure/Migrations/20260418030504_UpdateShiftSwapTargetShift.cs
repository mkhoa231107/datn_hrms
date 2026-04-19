using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HRMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateShiftSwapTargetShift : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TargetShiftId",
                table: "ShiftSwapRequests",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShiftSwapRequests_TargetShiftId",
                table: "ShiftSwapRequests",
                column: "TargetShiftId");

            migrationBuilder.AddForeignKey(
                name: "FK_ShiftSwapRequests_WorkShifts_TargetShiftId",
                table: "ShiftSwapRequests",
                column: "TargetShiftId",
                principalTable: "WorkShifts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ShiftSwapRequests_WorkShifts_TargetShiftId",
                table: "ShiftSwapRequests");

            migrationBuilder.DropIndex(
                name: "IX_ShiftSwapRequests_TargetShiftId",
                table: "ShiftSwapRequests");

            migrationBuilder.DropColumn(
                name: "TargetShiftId",
                table: "ShiftSwapRequests");
        }
    }
}
