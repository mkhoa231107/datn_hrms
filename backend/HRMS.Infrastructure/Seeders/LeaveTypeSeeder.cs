using HRMS.Domain.Entities;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HRMS.Infrastructure.Seeders
{
    public static class LeaveTypeSeeder
    {
        public static async Task SeedAsync(HRMSDbContext context)
        {
            var leaveTypes = new List<(string Name, string Code, string Desc, bool IsPaid, int Days)>
            {
                ("Phép năm", "ANNUAL", "Nghỉ phép năm theo quy định", true, 12),
                ("Nghỉ ốm", "SICK", "Nghỉ ốm đau, bệnh tật", true, 10),
                ("Nghỉ không lương", "UNPAID", "Nghỉ phép không hưởng lương", false, 30),
                ("Nghỉ thai sản", "MATERNITY", "Nghỉ thai sản theo Luật lao động (nữ 6 tháng)", true, 180),
                ("Nghỉ hiếu hỉ", "SPECIAL", "Nghỉ ma chay, cưới hỏi", true, 5)
            };

            foreach (var (name, code, desc, isPaid, days) in leaveTypes)
            {
                if (!await context.LeaveTypes.AnyAsync(lt => lt.Code == code))
                {
                    context.LeaveTypes.Add(new LeaveType
                    {
                        Name = name,
                        Code = code,
                        Description = desc,
                        IsPaid = isPaid,
                        DefaultDaysPerYear = days,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            if (context.ChangeTracker.HasChanges())
                await context.SaveChangesAsync();
        }

        /// <summary>
        /// Khởi tạo LeaveBalance cho toàn bộ nhân viên trong năm hiện tại
        /// </summary>
        public static async Task SeedLeaveBalancesAsync(HRMSDbContext context, int year)
        {
            var employees = await context.Employees.ToListAsync();
            var leaveTypes = await context.LeaveTypes.ToListAsync();
            
            // Fetch all existing balances for this year to avoid N+1 queries
            var existingBalances = await context.LeaveBalances
                .Where(lb => lb.Year == year)
                .Select(lb => new { lb.EmployeeId, lb.LeaveTypeId })
                .ToListAsync();

            var existingMap = new HashSet<(int EmpId, int TypeId)>(
                existingBalances.Select(b => (b.EmployeeId, b.LeaveTypeId))
            );

            foreach (var emp in employees)
            {
                foreach (var lt in leaveTypes)
                {
                    if (!existingMap.Contains((emp.Id, lt.Id)))
                    {
                        context.LeaveBalances.Add(new LeaveBalance
                        {
                            EmployeeId = emp.Id,
                            LeaveTypeId = lt.Id,
                            Year = year,
                            TotalDays = lt.DefaultDaysPerYear,
                            UsedDays = 0,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
            }

            if (context.ChangeTracker.HasChanges())
                await context.SaveChangesAsync();
        }
    }
}
