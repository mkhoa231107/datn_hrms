using HRMS.Domain.Entities;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HRMS.Infrastructure.Seeders
{
    public class AdminUserSeeder
    {
        public static async Task SeedAsync(HRMSDbContext context)
        {
            // Ensure ADM department exists
            var org = await context.Organizations.FirstOrDefaultAsync();
            if (org != null)
            {
                var admDept = await context.Departments.FirstOrDefaultAsync(d => d.DepartmentCode == "ADM");
                if (admDept == null)
                {
                    admDept = new Department 
                    { 
                        DepartmentName = "Quản trị viên", 
                        DepartmentCode = "ADM", 
                        Description = "Bộ phận quản trị hệ thống", 
                        OrganizationId = org.Id, 
                        IsActive = true 
                    };
                    context.Departments.Add(admDept);
                    await context.SaveChangesAsync();
                }

                var admPos = await context.Positions.FirstOrDefaultAsync(p => p.PositionCode == "ADM-SYS");
                if (admPos == null)
                {
                    admPos = new Position 
                    { 
                        PositionName = "Quản trị hệ thống", 
                        PositionCode = "ADM-SYS", 
                        Level = 1, 
                        DepartmentId = admDept.Id, 
                        IsActive = true 
                    };
                    context.Positions.Add(admPos);
                    await context.SaveChangesAsync();
                }
            }

            // ===== 1. Seed Admin User =====
            await SeedUserWithEmployee(context, "admin", "admin123", "admin@hrms.local",
                "System Administrator", "Admin", "ADMIN_01", "ADM", "ADM-SYS");


/*
            // ===== 3. Seed Trưởng phòng (DepartmentManager) =====
            await SeedUserWithEmployee(context, "manager_hr", "admin123", "truongphong1@hrms.local",
                "Phạm Văn Đức", "DepartmentManager", "TP_01", "HR", "HR_DIR");

            // ===== 4. Seed Chuyên viên C&B (Employee - acting as C&B) =====
            // Note: CnbSpecialist role was removed in previous refactors, use Employee or a generic role
            await SeedUserWithEmployee(context, "cnb_hr", "123456", "cnb1@hrms.local",
                "Hoàng Thị Mai", "Employee", "CNB_01", "HR", "HR_SPEC");
 
            // ===== 5. Seed Trưởng bộ phận (DepartmentHead) =====
            await SeedUserWithEmployee(context, "tl_hr_01", "123456", "totruong1@hrms.local",
                "Ngô Văn Hùng", "DepartmentHead", "TT_01", "HR", "HR_SPEC");

            // ===== 6. Seed Employee Users =====
            var employeeAccounts = new List<(string Username, string FullName, string Email, string EmpCode)>
            {
                ("nhanvien1", "Nguyễn Văn An", "nhanvien1@hrms.local", "NV_01"),
                ("nhanvien2", "Trần Thị Bình", "nhanvien2@hrms.local", "NV_02"),
                ("hr_01", "Lê Văn Cường", "nhanvien3@hrms.local", "NV_03")
            };

            foreach (var (username, fullName, email, empCode) in employeeAccounts)
            {
                await SeedUserWithEmployee(context, username, "123456", email,
                    fullName, "Employee", empCode, null, null);
            }
*/
        }

        /// <summary>
        /// Helper: Tạo User + gán Role + tạo Employee record nếu chưa tồn tại
        /// </summary>
        private static async Task SeedUserWithEmployee(
            HRMSDbContext context,
            string username, string password, string email,
            string fullName, string roleName, string employeeCode,
            string? deptCode, string? posCode)
        {
            // 1. Tìm hoặc tạo User
            var user = await context.Users.FirstOrDefaultAsync(u => u.Username == username);
            var role = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == roleName);

            if (user == null && role != null)
            {
                user = new User
                {
                    Username = username,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                    Email = email,
                    FullName = fullName,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                context.Users.Add(user);
                await context.SaveChangesAsync();

                // Gán role
                context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
                await context.SaveChangesAsync();
            }
            else if (user != null && role != null)
            {
                // Ensure correct role if user exists
                // Load user roles if not loaded
                if (user.UserRoles == null)
                    await context.Entry(user).Collection(u => u.UserRoles).LoadAsync();

                var existingRole = user.UserRoles.FirstOrDefault();
                if (existingRole == null)
                {
                    context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
                    await context.SaveChangesAsync();
                }
                else if (existingRole.RoleId != role.Id)
                {
                    context.UserRoles.Remove(existingRole);
                    await context.SaveChangesAsync();
                    
                    context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
                    await context.SaveChangesAsync();
                }
            }

            // 2. Tạo Employee record nếu chưa có
            if (user != null)
            {
                var existingEmployee = await context.Employees
                    .FirstOrDefaultAsync(e => e.UserId == user.Id);

                if (existingEmployee == null)
                {
                    // Tìm phòng ban và chức vụ
                    var dept = deptCode != null
                        ? await context.Departments.FirstOrDefaultAsync(d => d.DepartmentCode == deptCode)
                        : null;
                    dept ??= await context.Departments.FirstOrDefaultAsync();

                    var pos = posCode != null
                        ? await context.Positions.FirstOrDefaultAsync(p => p.PositionCode == posCode)
                        : null;
                    pos ??= await context.Positions.FirstOrDefaultAsync();

                    if (dept != null && pos != null)
                    {
                        var employee = new Employee
                        {
                            EmployeeCode = employeeCode,
                            FullName = fullName,
                            Email = email,
                            Phone = "0000000000",
                            Address = "HQ",
                            JoinDate = DateTime.UtcNow,
                            DateOfBirth = new DateTime(1990, 1, 1),
                            Gender = "Other",
                            Status = Domain.Enums.EmployeeStatus.Active,
                            OrganizationId = dept.OrganizationId,
                            DepartmentId = dept.Id,
                            PositionId = pos.Id,
                            UserId = user.Id,
                            CreatedAt = DateTime.UtcNow
                        };
                        context.Employees.Add(employee);
                    }
                }
            }

            if (context.ChangeTracker.HasChanges())
            {
                await context.SaveChangesAsync();
            }
        }
    }
}
