using System;
using System.Linq;
using System.Threading.Tasks;
using HRMS.Infrastructure.Data;
using HRMS.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using HRMS.Domain.Entities;

namespace HRMS.Tests
{
    class Program
    {
        static async Task Main(string[] args)
        {
            var host = Host.CreateDefaultBuilder()
                .ConfigureServices((context, services) =>
                {
                    services.AddDbContext<HRMSDbContext>(options =>
                        options.UseSqlServer("Server=localhost\\SQLEXPRESS;Database=HRMS_DATN;Trusted_Connection=True;TrustServerCertificate=True"));
                    services.AddScoped<IAuditLogService, AuditLogService>();
                })
                .Build();

            using var scope = host.Services.CreateScope();
            var service = scope.ServiceProvider.GetRequiredService<IAuditLogService>();
            var db = scope.ServiceProvider.GetRequiredService<HRMSDbContext>();

            Console.WriteLine("--- Verifying AuditLogService ---");

            // 1. Get a TeamId
            var team = await db.Teams.Skip(1).FirstOrDefaultAsync();
            if (team != null)
            {
                Console.WriteLine($"Testing TeamId: {team.Id} ({team.TeamName})");
                var logs = await service.GetTeamActivitiesAsync(team.Id);
                Console.WriteLine($"Found {logs.Count()} team logs.");
            }

            // 2. Get a DeptId
            var dept = await db.Departments.FirstOrDefaultAsync();
            if (dept != null)
            {
                Console.WriteLine($"Testing DeptId: {dept.Id} ({dept.DepartmentName})");
                var logs = await service.GetDepartmentActivitiesAsync(dept.Id);
                Console.WriteLine($"Found {logs.Count()} dept logs.");
            }

            Console.WriteLine("--- Verification Done ---");
        }
    }
}
