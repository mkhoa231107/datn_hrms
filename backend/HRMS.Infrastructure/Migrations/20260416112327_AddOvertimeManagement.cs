using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HRMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddOvertimeManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TimeAttendanceRecords_EmployeeId",
                table: "TimeAttendanceRecords");

            migrationBuilder.CreateTable(
                name: "OvertimePlans",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DepartmentId = table.Column<int>(type: "int", nullable: false),
                    Month = table.Column<int>(type: "int", nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false),
                    TotalBudgetHours = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedById = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OvertimePlans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OvertimePlans_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OvertimePlans_Employees_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OvertimeAssignments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OvertimePlanId = table.Column<int>(type: "int", nullable: true),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AssignedMaxHours = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    AssignedById = table.Column<int>(type: "int", nullable: false),
                    IsNotified = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OvertimeAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OvertimeAssignments_Employees_AssignedById",
                        column: x => x.AssignedById,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OvertimeAssignments_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OvertimeAssignments_OvertimePlans_OvertimePlanId",
                        column: x => x.OvertimePlanId,
                        principalTable: "OvertimePlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TimeAttendanceRecords_EmployeeId_Date",
                table: "TimeAttendanceRecords",
                columns: new[] { "EmployeeId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_OvertimeAssignments_AssignedById",
                table: "OvertimeAssignments",
                column: "AssignedById");

            migrationBuilder.CreateIndex(
                name: "IX_OvertimeAssignments_EmployeeId",
                table: "OvertimeAssignments",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_OvertimeAssignments_OvertimePlanId",
                table: "OvertimeAssignments",
                column: "OvertimePlanId");

            migrationBuilder.CreateIndex(
                name: "IX_OvertimePlans_CreatedById",
                table: "OvertimePlans",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_OvertimePlans_DepartmentId",
                table: "OvertimePlans",
                column: "DepartmentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OvertimeAssignments");

            migrationBuilder.DropTable(
                name: "OvertimePlans");

            migrationBuilder.DropIndex(
                name: "IX_TimeAttendanceRecords_EmployeeId_Date",
                table: "TimeAttendanceRecords");

            migrationBuilder.CreateIndex(
                name: "IX_TimeAttendanceRecords_EmployeeId",
                table: "TimeAttendanceRecords",
                column: "EmployeeId");
        }
    }
}
