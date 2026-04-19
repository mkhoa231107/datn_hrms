using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HRMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateShiftSwapToDateRange : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ShiftSwapRequests_WorkShifts_ShiftAId",
                table: "ShiftSwapRequests");

            migrationBuilder.DropForeignKey(
                name: "FK_ShiftSwapRequests_WorkShifts_ShiftBId",
                table: "ShiftSwapRequests");

            migrationBuilder.DropIndex(
                name: "IX_ShiftSwapRequests_ShiftAId",
                table: "ShiftSwapRequests");

            migrationBuilder.DropIndex(
                name: "IX_ShiftSwapRequests_ShiftBId",
                table: "ShiftSwapRequests");

            migrationBuilder.DropColumn(
                name: "ShiftAId",
                table: "ShiftSwapRequests");

            migrationBuilder.DropColumn(
                name: "ShiftBId",
                table: "ShiftSwapRequests");

            migrationBuilder.RenameColumn(
                name: "DateB",
                table: "ShiftSwapRequests",
                newName: "StartDate");

            migrationBuilder.RenameColumn(
                name: "DateA",
                table: "ShiftSwapRequests",
                newName: "EndDate");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "StartDate",
                table: "ShiftSwapRequests",
                newName: "DateB");

            migrationBuilder.RenameColumn(
                name: "EndDate",
                table: "ShiftSwapRequests",
                newName: "DateA");

            migrationBuilder.AddColumn<int>(
                name: "ShiftAId",
                table: "ShiftSwapRequests",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ShiftBId",
                table: "ShiftSwapRequests",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_ShiftSwapRequests_ShiftAId",
                table: "ShiftSwapRequests",
                column: "ShiftAId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftSwapRequests_ShiftBId",
                table: "ShiftSwapRequests",
                column: "ShiftBId");

            migrationBuilder.AddForeignKey(
                name: "FK_ShiftSwapRequests_WorkShifts_ShiftAId",
                table: "ShiftSwapRequests",
                column: "ShiftAId",
                principalTable: "WorkShifts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ShiftSwapRequests_WorkShifts_ShiftBId",
                table: "ShiftSwapRequests",
                column: "ShiftBId",
                principalTable: "WorkShifts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
