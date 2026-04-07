
using Microsoft.EntityFrameworkCore;
using HRMS.Infrastructure.Data;
using HRMS.Domain.Entities;

var context = new HRMSDbContext(new DbContextOptionsBuilder<HRMSDbContext>()
    .UseSqlServer("Server=ACER\\SQLEXPRESS01;Database=HRMS_DATN;Trusted_Connection=True;TrustServerCertificate=True;")
    .Options);

var users = await context.Users
    .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
    .Include(u => u.Employee)
    .Where(u => u.Username == "hr_cb_01" || u.Username == "hr_cb_02")
    .ToListAsync();

foreach (var user in users)
{
    Console.WriteLine($"User: {user.Username}");
    Console.WriteLine($" - Roles: {string.Join(", ", user.UserRoles.Select(ur => ur.Role.RoleName))}");
    Console.WriteLine($" - EmployeeId: {user.Employee?.Id}");
    Console.WriteLine($" - DepartmentId: {user.Employee?.DepartmentId}");
}

var pendingLeaves = await context.LeaveRequests
    .Include(lr => lr.Employee)
    .Where(lr => lr.Status == HRMS.Domain.Enums.LeaveStatus.Pending)
    .ToListAsync();

Console.WriteLine($"Total Pending Leaves: {pendingLeaves.Count}");
foreach(var lr in pendingLeaves) {
    Console.WriteLine($" - Request {lr.Id}: Employee {lr.Employee.FullName} (Dept {lr.Employee.DepartmentId}), Days {lr.TotalDays}");
}
