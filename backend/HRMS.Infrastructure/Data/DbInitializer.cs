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
            await RoleSeeder.SeedAsync(context);
            await PermissionSeeder.SeedAsync(context);
            await RolePermissionSeeder.SeedAsync(context);
            
            // 3. Seed comprehensive organization structure (handled by SQL script now)
            await OrganizationSeeder.SeedAsync(context);
            await AdminUserSeeder.SeedAsync(context);
            
            // 4. Seed Teams (Removed in favor of SQL script or SubDepartment)
            // 5. Seed Work Shifts and Initial Period
            await WorkShiftSeeder.SeedAsync(context);

            // 7. Sửa lỗi liên kết và đảm bảo lịch làm việc cho quá trình kiểm tra
            await DataFixSeeder.FixUserRolesAsync(context);
            await DataFixSeeder.FixAdminEmployeeLinkageAsync(context); 
            await DataFixSeeder.EnsureAllManagersHaveEmployeesAsync(context);

            // 8. Seed initial Leave Balances
            await LeaveTypeSeeder.SeedLeaveBalancesAsync(context, DateTime.Now.Year);

            // 9. Mass Seed 151 PRD-ASS Workers with 2026 Rotating Schedules
            // Force running once to apply new rotation logic for the whole year
            var connectionString = context.Database.GetDbConnection().ConnectionString;
            await MassWorkerSeeder.SeedAsync(context, connectionString);

            var empCount = await context.Employees.CountAsync();
            var userCount = await context.Users.CountAsync();
            Console.WriteLine($"📊 Database Status: {userCount} Users, {empCount} Employees.");
        }
    }
}
