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

            // 6. Seed Leave Types
            await LeaveTypeSeeder.SeedAsync(context);

            // 7. Sửa lỗi liên kết và đảm bảo lịch làm việc cho quá trình kiểm tra
            await DataFixSeeder.FixUserRolesAsync(context);
            await DataFixSeeder.FixAdminEmployeeLinkageAsync(context); // This now fixes ALL users
            // await DataFixSeeder.EnsureAllManagersHaveEmployeesAsync(context); // Commented out to prevent crashes
            // await DataFixSeeder.ClearLeaveHistoryAsync(context); // Commented out for safety
            // await DataFixSeeder.EnsureSchedulesForTestingAsync(context);

            // 8. Seed initial Leave Balances (NOW including all employees created above)
            await LeaveTypeSeeder.SeedLeaveBalancesAsync(context, DateTime.Now.Year);

            var empCount = await context.Employees.CountAsync();
            var userCount = await context.Users.CountAsync();
            Console.WriteLine($"📊 Database Status: {userCount} Users, {empCount} Employees.");
        }
    }
}
