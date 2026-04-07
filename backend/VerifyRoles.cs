
using Microsoft.EntityFrameworkCore;
using HRMS.Infrastructure.Data;
using HRMS.Domain.Entities;
using System.Linq;

var context = new HRMSDbContext(new DbContextOptionsBuilder<HRMSDbContext>()
    .UseSqlServer("Server=ACER\\SQLEXPRESS01;Database=HRMS_DATN;Trusted_Connection=True;TrustServerCertificate=True;")
    .Options);

var roles = await context.Roles.ToListAsync();
Console.WriteLine("--- Danh sách Roles trong DB ---");
foreach (var r in roles) {
    Console.WriteLine($" - '{r.RoleName}' (ID: {r.Id})");
}

var user = await context.Users
    .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
    .FirstOrDefaultAsync(u => u.Username == "hr_cb_01");

if (user != null) {
    Console.WriteLine($"--- User: {user.Username} ---");
    Console.WriteLine($" - FullName: {user.FullName}");
    Console.WriteLine($" - Roles: {string.Join(", ", user.UserRoles.Select(ur => ur.Role.RoleName))}");
} else {
    Console.WriteLine("Không tìm thấy user hr_cb_01");
}
