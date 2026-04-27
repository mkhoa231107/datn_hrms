using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace HRMS.Diagnostic
{
    public class DbCheck
    {
        public static async Task Run(HRMSDbContext context)
        {
            var empCount = await context.Employees.CountAsync();
            var activeEmpCount = await context.Employees.Where(e => e.IsActive).CountAsync();
            var workerCount = await context.Employees.Where(e => e.IsActive && !e.Position.PositionName.Contains("Trưởng")).CountAsync();
            var posCount = await context.Positions.CountAsync();
            var deptCount = await context.Departments.CountAsync();

            Console.WriteLine($"Total Employees: {empCount}");
            Console.WriteLine($"Active Employees: {activeEmpCount}");
            Console.WriteLine($"Employees (non-managers): {workerCount}");
            Console.WriteLine($"Total Positions: {posCount}");
            Console.WriteLine($"Total Departments: {deptCount}");

            var posList = await context.Positions.ToListAsync();
            Console.WriteLine("Positions in DB:");
            foreach (var p in posList)
            {
                Console.WriteLine($" - [{p.Id}] {p.PositionName} ({p.PositionCode})");
            }
        }
    }
}
