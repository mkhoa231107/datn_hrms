using HRMS.Infrastructure.Seeders;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using System;

namespace HRMS.Infrastructure.Data
{
    public static class DbInitializer
    {
        public static async Task InitializeAsync(HRMSDbContext context)
        {
            // 0. Priority Patch Schema
            await DataFixSeeder.FixOvertimeSchemaAsync(context);

            // 1. Cleanup all existing data to ensure a fresh start
            // await CleanupSeeder.SeedAsync(context);

            // 2. Seed basic roles and permissions
            Console.WriteLine("🔑 RoleSeeder: Starting...");
            await RoleSeeder.SeedAsync(context);
            Console.WriteLine("🔑 PermissionSeeder: Starting...");
            await PermissionSeeder.SeedAsync(context);
            Console.WriteLine("🔑 RolePermissionSeeder: Starting...");
            await RolePermissionSeeder.SeedAsync(context);
            
            // 3. Seed comprehensive organization structure (handled by SQL script now)
            await OrganizationSeeder.SeedAsync(context);
            
            Console.WriteLine("👤 AdminUserSeeder: Starting...");
            await AdminUserSeeder.SeedAsync(context);
            
            // 4. Seed Teams (Removed in favor of SQL script or SubDepartment)
            // 5. Seed Work Shifts and Initial Period
            Console.WriteLine("⏰ WorkShiftSeeder: Starting...");
            await WorkShiftSeeder.SeedAsync(context);

            // 7. Sửa lỗi liên kết và đảm bảo lịch làm việc cho quá trình kiểm tra
            Console.WriteLine("🛠️ DataFixSeeder: Starting FixUserRoles...");
            await DataFixSeeder.FixUserRolesAsync(context);
            Console.WriteLine("🛠️ DataFixSeeder: Starting FixAdminEmployeeLinkage...");
            await DataFixSeeder.FixAdminEmployeeLinkageAsync(context); 
            Console.WriteLine("🛠️ DataFixSeeder: Starting EnsureAllManagersHaveEmployees...");
            await DataFixSeeder.EnsureAllManagersHaveEmployeesAsync(context);
            
            Console.WriteLine("🛠️ DataFixSeeder: Updating Employee Emails...");
            await DataFixSeeder.FixEmployeeEmailsAsync(context);

            Console.WriteLine("🛠️ DataFixSeeder: Populating Missing Info...");
            await DataFixSeeder.FixMissingEmployeeInfoAsync(context);

            Console.WriteLine("🛠️ DataFixSeeder: Fixing Coefficients and Salaries...");
            await DataFixSeeder.FixManagerPositionsAsync(context);
            await DataFixSeeder.FixPositionCoefficientsAsync(context);
            await DataFixSeeder.FixContractSalariesAsync(context);

            // 8. Mass Seed 151 PRD-ASS Workers with 2026 Rotating Schedules
            // Force running once to apply new rotation logic for the whole year
            Console.WriteLine("🏭 MassWorkerSeeder: Starting...");
            var connectionString = context.Database.GetDbConnection().ConnectionString;
            await MassWorkerSeeder.SeedAsync(context, connectionString);

            // 9. Seed initial Leave Balances for ALL employees (including newly created PRD-ASS workers)
            Console.WriteLine("🌴 LeaveTypeSeeder: Starting...");
            await LeaveTypeSeeder.SeedAsync(context);
            Console.WriteLine("🌴 LeaveTypeSeeder: Starting SeedLeaveBalances...");
            await LeaveTypeSeeder.SeedLeaveBalancesAsync(context, DateTime.Now.Year);

            var empCount = await context.Employees.CountAsync();
            var userCount = await context.Users.CountAsync();
            Console.WriteLine($"📊 Database Status: {userCount} Users, {empCount} Employees.");
            Console.WriteLine("🚀 Backend Initialization Complete!");
        }
    }
}
