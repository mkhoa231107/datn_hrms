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
                ("Admin",            "Quản trị viên - Quản lý user, hợp đồng, hệ thống"),
                ("Employee",         "Nhân viên - Người lao động"),
                ("DepartmentManager","Trưởng phòng - Quản lý phòng ban, chốt công, duyệt đơn dài hạn"),
                ("DepartmentHead",   "Trưởng bộ phận - Xếp ca, duyệt đơn bộ phận, giám sát chấm công"),
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

            // Remove old TeamLeader role if it was renamed
            var oldTLRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "TeamLeader");
            if (oldTLRole != null)
            {
                var newRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "DepartmentHead");
                if (newRole != null)
                {
                    var oldMappings = await context.UserRoles
                        .Where(ur => ur.RoleId == oldTLRole.Id).ToListAsync();
                    foreach (var mapping in oldMappings)
                    {
                        if (!await context.UserRoles.AnyAsync(ur => ur.UserId == mapping.UserId && ur.RoleId == newRole.Id))
                            context.UserRoles.Add(new UserRole { UserId = mapping.UserId, RoleId = newRole.Id, AssignedAt = System.DateTime.UtcNow, CreatedAt = System.DateTime.UtcNow });
                    }
                    context.UserRoles.RemoveRange(oldMappings);
                }
                context.Roles.Remove(oldTLRole);
            }
            
            // Remove CnbSpecialist role
            var cnbRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "CnbSpecialist");
            if (cnbRole != null)
            {
                var roleMappings = await context.UserRoles.Where(ur => ur.RoleId == cnbRole.Id).ToListAsync();
                context.UserRoles.RemoveRange(roleMappings);
                context.Roles.Remove(cnbRole);
            }

            // Remove HrAdmin role
            var hrAdminRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "HrAdmin");
            if (hrAdminRole != null)
            {
                var roleMappings = await context.UserRoles.Where(ur => ur.RoleId == hrAdminRole.Id).ToListAsync();
                context.UserRoles.RemoveRange(roleMappings);
                context.Roles.Remove(hrAdminRole);
            }

            if (context.ChangeTracker.HasChanges())
                await context.SaveChangesAsync();
        }
    }
}
