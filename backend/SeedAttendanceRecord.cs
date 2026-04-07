using System;
using System.Linq;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using HRMS.Infrastructure.Data;
using HRMS.Domain.Entities;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var host = Host.CreateDefaultBuilder(args)
    .ConfigureServices((hostContext, services) =>
    {
        services.AddDbContext<HRMSDbContext>(options =>
            options.UseSqlServer("Server=localhost\\SQLEXPRESS;Database=HRMS_DATN;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True"));
    })
    .Build();

using (var scope = host.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<HRMSDbContext>();
    
    Console.WriteLine("🚀 Seeding full attendance data for March 2026...");
    
    var employees = await context.Employees.ToListAsync();
    var startDate = new DateTime(2026, 3, 1);
    var endDate = new DateTime(2026, 3, 31);
    
    // Clear existing records for this range to avoid duplicates
    var existingRecords = await context.TimeAttendanceRecords
        .Where(r => r.Date >= startDate && r.Date <= endDate)
        .ToListAsync();
    context.TimeAttendanceRecords.RemoveRange(existingRecords);
    await context.SaveChangesAsync();

    int count = 0;
    foreach (var emp in employees)
    {
        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            // Skip weekends (only Sunday)
            if (date.DayOfWeek == DayOfWeek.Sunday) continue;

            // CheckIn at 08:00
            context.TimeAttendanceRecords.Add(new TimeAttendanceRecord
            {
                EmployeeId = emp.Id,
                Date = date,
                Timestamp = date.AddHours(8),
                Type = "CheckIn",
                Location = "Văn phòng",
                DeviceInfo = "Test Script",
                CreatedAt = DateTime.UtcNow
            });

            // CheckOut at 17:00
            context.TimeAttendanceRecords.Add(new TimeAttendanceRecord
            {
                EmployeeId = emp.Id,
                Date = date,
                Timestamp = date.AddHours(17),
                Type = "CheckOut",
                Location = "Văn phòng",
                DeviceInfo = "Test Script",
                CreatedAt = DateTime.UtcNow
            });
            count += 2;
        }
    }

    await context.SaveChangesAsync();
    Console.WriteLine($"✅ Successfully seeded {count} records for {employees.Count} employees.");
}
