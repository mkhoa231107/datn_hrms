using HRMS.Domain.Entities;
using HRMS.Domain.Enums;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace HRMS.Infrastructure.Seeders
{
    public static class RoleSeeder
    {
        public static async Task SeedAsync(HRMSDbContext context)
        {
            var rolesToSeed = new List<(string Name, string Description)>
            {
                ("DepartmentManager", "Trưởng phòng - Quản lý nhân sự và ngân sách phòng ban"),
                ("DepartmentHead",    "Trưởng bộ phận - Quản lý hoạt động và công của bộ phận/tổ"),
                ("CnbSpecialist",    "Chuyên viên C&B - Tính toán lương, chốt bảng công"),
                ("Employee",         "Nhân viên - Xem lịch, nhận thông báo, chấm công"),
                ("Accountant",       "Kế toán - Quản lý tính toán lương và quyết toán")
            };

            foreach (var (name, description) in rolesToSeed)
            {
                if (!await context.Roles.AnyAsync(r => r.RoleName == name))
                {
                    context.Roles.Add(new Role
                    {
                        RoleName = name,
                        Description = description
                    });
                }
                else
                {
                    // Update description if changed
                    var existing = await context.Roles.FirstAsync(r => r.RoleName == name);
                    if (existing.Description != description)
                        existing.Description = description;
                }
            }

            if (context.ChangeTracker.HasChanges())
                await context.SaveChangesAsync();

            // Clean up Admin, TeamLeader and HrAdmin if they exist
            var rolesToClean = new[] { "Admin", "TeamLeader", "HrAdmin" };
            var fallbackRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "DepartmentManager");

            foreach (var roleName in rolesToClean)
            {
                var roleToRemove = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == roleName);
                if (roleToRemove != null)
                {
                    var roleMappings = await context.UserRoles.Where(ur => ur.RoleId == roleToRemove.Id).ToListAsync();
                    foreach (var mapping in roleMappings)
                    {
                        if (fallbackRole != null && 
                            !await context.UserRoles.AnyAsync(ur => ur.UserId == mapping.UserId && ur.RoleId == fallbackRole.Id) &&
                            !context.UserRoles.Local.Any(ur => ur.UserId == mapping.UserId && ur.RoleId == fallbackRole.Id))
                        {
                            context.UserRoles.Add(new UserRole { UserId = mapping.UserId, RoleId = fallbackRole.Id, AssignedAt = System.DateTime.UtcNow, CreatedAt = System.DateTime.UtcNow });
                        }
                    }
                    context.UserRoles.RemoveRange(roleMappings);
                    context.Roles.Remove(roleToRemove);
                }
            }

            if (context.ChangeTracker.HasChanges())
                await context.SaveChangesAsync();
        }

    }
}
