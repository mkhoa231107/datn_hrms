using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HRMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveDeprecatedModules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OvertimeAssignments");

            migrationBuilder.DropTable(
                name: "TaskUpdates");

            migrationBuilder.DropTable(
                name: "OvertimePlans");

            migrationBuilder.DropTable(
                name: "JobAssignments");

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
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

            migrationBuilder.CreateTable(
                name: "JobAssignments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    ManagerId = table.Column<int>(type: "int", nullable: false),
                    CompletionPercentage = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EvaluationScore = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    InstructionFileUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Priority = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Weight = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JobAssignments_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_JobAssignments_Employees_ManagerId",
                        column: x => x.ManagerId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OvertimePlans",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CreatedById = table.Column<int>(type: "int", nullable: false),
                    DepartmentId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Month = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TotalBudgetHours = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false)
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
                name: "TaskUpdates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    JobAssignmentId = table.Column<int>(type: "int", nullable: false),
                    AttachmentUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdateContent = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdateTime = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskUpdates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TaskUpdates_JobAssignments_JobAssignmentId",
                        column: x => x.JobAssignmentId,
                        principalTable: "JobAssignments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OvertimeAssignments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AssignedById = table.Column<int>(type: "int", nullable: false),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    OvertimePlanId = table.Column<int>(type: "int", nullable: true),
                    AssignedMaxHours = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    ConfirmedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    IsNotified = table.Column<bool>(type: "bit", nullable: false),
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
                name: "IX_JobAssignments_EmployeeId",
                table: "JobAssignments",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_JobAssignments_ManagerId",
                table: "JobAssignments",
                column: "ManagerId");

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

            migrationBuilder.CreateIndex(
                name: "IX_TaskUpdates_JobAssignmentId",
                table: "TaskUpdates",
                column: "JobAssignmentId");
        }
    }
}
