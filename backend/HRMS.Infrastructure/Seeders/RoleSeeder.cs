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
                ("Admin",            "Quản trị viên - Toàn quyền hệ thống"),
                ("DepartmentManager", "Trưởng phòng - Quản lý nhân sự và ngân sách phòng ban"),
                ("DepartmentHead",    "Trưởng bộ phận - Quản lý hoạt động và công của bộ phận/tổ"),
                ("TeamLeader",       "Tổ trưởng - Điều phối ca làm việc và tăng ca đội nhóm"),
                ("CnbSpecialist",    "Chuyên viên C&B - Tính toán lương, chốt bảng công"),
                ("Employee",         "Nhân viên - Xem lịch, nhận thông báo, chấm công"),
                ("Candidate",        "Ứng viên - Người tìm việc")
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

            // Clean up HrAdmin if it exists
            var hrAdminRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "HrAdmin");
            if (hrAdminRole != null)
            {
                var roleMappings = await context.UserRoles.Where(ur => ur.RoleId == hrAdminRole.Id).ToListAsync();
                var adminRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Admin");
                foreach (var mapping in roleMappings)
                {
                    if (!await context.UserRoles.AnyAsync(ur => ur.UserId == mapping.UserId && ur.RoleId == adminRole.Id))
                        context.UserRoles.Add(new UserRole { UserId = mapping.UserId, RoleId = adminRole.Id, AssignedAt = System.DateTime.UtcNow, CreatedAt = System.DateTime.UtcNow });
                }
                context.UserRoles.RemoveRange(roleMappings);
                context.Roles.Remove(hrAdminRole);
            }

            if (context.ChangeTracker.HasChanges())
                await context.SaveChangesAsync();
        }

    }
}
