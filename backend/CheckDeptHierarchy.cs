
using Microsoft.EntityFrameworkCore;
using HRMS.Infrastructure.Data;
using System;
using System.Linq;

var context = new HRMSDbContext(new DbContextOptionsBuilder<HRMSDbContext>()
    .UseSqlServer("Server=ACER\\SQLEXPRESS01;Database=HRMS_DATN;Trusted_Connection=True;TrustServerCertificate=True;")
    .Options);

var depts = await context.Departments.ToListAsync();
Console.WriteLine("--- DANH SÁCH BỘ PHẬN ---");
foreach (var d in depts) {
    Console.WriteLine($"ID: {d.Id}, Name: {d.DepartmentName}, ParentId: {d.ParentDepartmentId}");
}

var users = await context.Users
    .Include(u => u.Employee)
    .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
    .Where(u => u.Username == "hr_cb_01" || u.Username == "hr_cb_02")
    .ToListAsync();

Console.WriteLine("\n--- THÔNG TIN USER KIỂM THỬ ---");
foreach (var u in users) {
    Console.WriteLine($"User: {u.Username}, EmpDeptId: {u.Employee?.DepartmentId}, Roles: {string.Join(", ", u.UserRoles.Select(ur => ur.Role.RoleName))}");
}
