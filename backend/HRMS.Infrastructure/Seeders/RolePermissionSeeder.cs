using HRMS.Domain.Entities;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace HRMS.Infrastructure.Seeders
{
    /// <summary>
    /// Seeds Role-Permission mappings based on the refined RBAC permission matrix.
    /// Uses upsert logic to safely add new mappings without duplicating existing ones.
    /// </summary>
    public static class RolePermissionSeeder
    {
        public static async Task SeedAsync(HRMSDbContext context)
        {
            var roles = await context.Roles.ToListAsync();
            var permissions = await context.Permissions.ToListAsync();
            var existingMappings = await context.RolePermissions.ToListAsync();

            var newMappings = new List<RolePermission>();


            // ====== DepartmentManager: Trưởng phòng ======
            // Xem & quản lý phòng ban, chốt công, duyệt đơn dài hạn
            var deptMgrPermissions = new[]
            {
                // Nhân sự phòng ban
                "employee.view_department", "employee.view_own", "employee.update_own",
                // Chấm công
                "attendance.checkinout", "attendance.view_own",
                "attendance.view_department", "attendance.finalize", "attendance.export",
                // Đơn từ (duyệt dài hạn)
                "leave.create", "leave.approve_department",
                // Lịch ca
                "schedule.view_all", "schedule.view_own",
                // Lương cá nhân
                "payroll.view_own"
            };
            AssignPermissions(roles, permissions, existingMappings, newMappings, "DepartmentManager", deptMgrPermissions);

            // ====== DepartmentHead: Trưởng bộ phận ======
            // Xếp ca, duyệt đơn ngắn hạn (Không có quyền chấm công nhóm)
            var deptHeadPermissions = new[]
            {
                // Xem nhân viên bộ phận
                "employee.view_team", "employee.view_own", "employee.update_own",
                // Chấm công (Chỉ cá nhân)
                "attendance.checkinout", "attendance.view_own",
                // Đơn từ (duyệt ngắn hạn <= 3 ngày)
                "leave.create", "leave.approve_team",
                // Xếp ca cho bộ phận
                "schedule.assign_shift", "schedule.view_all", "schedule.view_own",
                // Lương cá nhân
                "payroll.view_own"
            };
            AssignPermissions(roles, permissions, existingMappings, newMappings, "DepartmentHead", deptHeadPermissions);

            // ====== Employee: Tự phục vụ ======
            var employeePermissions = new[]
            {
                "employee.view_own", "employee.update_own",
                "attendance.checkinout", "attendance.view_own",
                "leave.create",
                "schedule.view_own",
                "payroll.view_own"
            };
            AssignPermissions(roles, permissions, existingMappings, newMappings, "Employee", employeePermissions);

            // ====== CnbSpecialist: Chuyên viên C&B (Quản lý lương & công) ======
            var cnbPermissions = new[]
            {
                // Toàn quyền Payroll
                "payroll.setup", "payroll.calculate", "payroll.export_report", 
                "payroll.view_all", "payroll.view_own", "payroll.finalize",
                // Quyền quản lý nhân sự & công để tính lương
                "employee.view_all", "employee.view_department",
                "attendance.view_all", "attendance.view_department",
                "attendance.finalize",
                // Đơn từ
                "leave.create", "payroll.view_own"
            };
            AssignPermissions(roles, permissions, existingMappings, newMappings, "CnbSpecialist", cnbPermissions);

            // ====== Accountant: Kế toán (Đối soát & Báo cáo) ======
            var accountantPermissions = new[]
            {
                // Chỉ xem để đối soát thanh toán
                "payroll.view_all", "payroll.view_own", "payroll.export_report",
                "employee.view_all", "attendance.view_all",
                "leave.create"
            };
            AssignPermissions(roles, permissions, existingMappings, newMappings, "Accountant", accountantPermissions);

            if (newMappings.Any())
            {
                await context.RolePermissions.AddRangeAsync(newMappings);
                await context.SaveChangesAsync();
            }
        }

        private static void AssignAllPermissions(
            List<Role> roles, List<Permission> permissions,
            List<RolePermission> existing, List<RolePermission> newMappings,
            string roleName)
        {
            var role = roles.FirstOrDefault(r => r.RoleName == roleName);
            if (role == null) return;

            foreach (var permission in permissions)
            {
                if (!existing.Any(rp => rp.RoleId == role.Id && rp.PermissionId == permission.Id)
                    && !newMappings.Any(rp => rp.RoleId == role.Id && rp.PermissionId == permission.Id))
                {
                    newMappings.Add(new RolePermission
                    {
                        RoleId = role.Id,
                        PermissionId = permission.Id,
                        GrantedAt = DateTime.UtcNow
                    });
                }
            }
        }

        private static void AssignPermissions(
            List<Role> roles, List<Permission> permissions,
            List<RolePermission> existing, List<RolePermission> newMappings,
            string roleName, string[] permissionNames)
        {
            var role = roles.FirstOrDefault(r => r.RoleName == roleName);
            if (role == null) return;

            foreach (var permName in permissionNames)
            {
                var permission = permissions.FirstOrDefault(p => p.PermissionName == permName);
                if (permission == null) continue;

                if (!existing.Any(rp => rp.RoleId == role.Id && rp.PermissionId == permission.Id)
                    && !newMappings.Any(rp => rp.RoleId == role.Id && rp.PermissionId == permission.Id))
                {
                    newMappings.Add(new RolePermission
                    {
                        RoleId = role.Id,
                        PermissionId = permission.Id,
                        GrantedAt = DateTime.UtcNow
                    });
                }
            }
        }
    }
}
