using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HRMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddShiftSwapModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
/*
            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "OvertimePlans",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ConfirmedAt",
                table: "OvertimeAssignments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsConfirmed",
                table: "OvertimeAssignments",
                type: "bit",
                nullable: false,
                defaultValue: false);
*/

            migrationBuilder.CreateTable(
                name: "ShiftSwapRequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployeeAId = table.Column<int>(type: "int", nullable: false),
                    EmployeeBId = table.Column<int>(type: "int", nullable: false),
                    DateA = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ShiftAId = table.Column<int>(type: "int", nullable: false),
                    DateB = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ShiftBId = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Address = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    SignatureA = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SignedAtA = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SignatureB = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SignedAtB = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ManagerId = table.Column<int>(type: "int", nullable: true),
                    SignatureManager = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SignedAtManager = table.Column<DateTime>(type: "datetime2", nullable: true),
                    HRId = table.Column<int>(type: "int", nullable: true),
                    SignatureHR = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SignedAtHR = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RejectReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PdfUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftSwapRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShiftSwapRequests_Employees_EmployeeAId",
                        column: x => x.EmployeeAId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ShiftSwapRequests_Employees_EmployeeBId",
                        column: x => x.EmployeeBId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ShiftSwapRequests_Employees_HRId",
                        column: x => x.HRId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ShiftSwapRequests_Employees_ManagerId",
                        column: x => x.ManagerId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ShiftSwapRequests_WorkShifts_ShiftAId",
                        column: x => x.ShiftAId,
                        principalTable: "WorkShifts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ShiftSwapRequests_WorkShifts_ShiftBId",
                        column: x => x.ShiftBId,
                        principalTable: "WorkShifts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ShiftSwapRequests_EmployeeAId",
                table: "ShiftSwapRequests",
                column: "EmployeeAId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftSwapRequests_EmployeeBId",
                table: "ShiftSwapRequests",
                column: "EmployeeBId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftSwapRequests_HRId",
                table: "ShiftSwapRequests",
                column: "HRId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftSwapRequests_ManagerId",
                table: "ShiftSwapRequests",
                column: "ManagerId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftSwapRequests_ShiftAId",
                table: "ShiftSwapRequests",
                column: "ShiftAId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftSwapRequests_ShiftBId",
                table: "ShiftSwapRequests",
                column: "ShiftBId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ShiftSwapRequests");

/*
            migrationBuilder.DropColumn(
                name: "Description",
                table: "OvertimePlans");

            migrationBuilder.DropColumn(
                name: "ConfirmedAt",
                table: "OvertimeAssignments");

            migrationBuilder.DropColumn(
                name: "IsConfirmed",
                table: "OvertimeAssignments");
*/
        }
    }
}
