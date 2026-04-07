using HRMS.Domain.Entities;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HRMS.Infrastructure.Seeders
{
    public static class WorkShiftSeeder
    {
        public static async Task SeedAsync(HRMSDbContext context)
        {
            var org = await context.Organizations.FirstOrDefaultAsync();
            if (org == null) return;

            if (!await context.WorkShifts.AnyAsync())
            {
                var shifts = new List<WorkShift>
                {
                    new WorkShift { 
                        ShiftName = "Hành chính", 
                        ShiftCode = "HC", 
                        StartTime = new TimeSpan(8, 0, 0), 
                        EndTime = new TimeSpan(17, 30, 0), 
                        BreakMinutes = 90, 
                        OrganizationId = org.Id 
                    },
                    new WorkShift { 
                        ShiftName = "Ca Sáng", 
                        ShiftCode = "S1", 
                        StartTime = new TimeSpan(6, 0, 0), 
                        EndTime = new TimeSpan(14, 0, 0), 
                        BreakMinutes = 30, 
                        OrganizationId = org.Id 
                    },
                    new WorkShift { 
                        ShiftName = "Ca Chiều", 
                        ShiftCode = "C1", 
                        StartTime = new TimeSpan(14, 0, 0), 
                        EndTime = new TimeSpan(22, 0, 0), 
                        BreakMinutes = 30, 
                        OrganizationId = org.Id 
                    },
                    new WorkShift { 
                        ShiftName = "Ca Đêm", 
                        ShiftCode = "D1", 
                        StartTime = new TimeSpan(22, 0, 0), 
                        EndTime = new TimeSpan(6, 0, 0), 
                        BreakMinutes = 30, 
                        IsOvernight = true,
                        OrganizationId = org.Id 
                    }
                };
                context.WorkShifts.AddRange(shifts);
                await context.SaveChangesAsync();
            }

            // Ensure 2026 periods exists regardless of whether other periods exist
            if (!await context.SchedulePeriods.AnyAsync(p => p.StartDate.Year == 2026))
            {
                var periods = new List<SchedulePeriod>();
                for (int m = 1; m <= 12; m++)
                {
                    periods.Add(new SchedulePeriod
                    {
                        PeriodName = $"Tháng {m:D2}/2026",
                        StartDate = new DateTime(2026, m, 1),
                        EndDate = new DateTime(2026, m, DateTime.DaysInMonth(2026, m)),
                        OrganizationId = org.Id
                    });
                }
                context.SchedulePeriods.AddRange(periods);
                await context.SaveChangesAsync();
            }

            if (!await context.SchedulePeriods.AnyAsync())
            {
                // Fallback for initial seed if absolutely nothing exists
                var period = new SchedulePeriod
                {
                    PeriodName = "Tháng 05/2024",
                    StartDate = new DateTime(2024, 05, 01),
                    EndDate = new DateTime(2024, 05, 31),
                    OrganizationId = org.Id
                };
                context.SchedulePeriods.Add(period);
                await context.SaveChangesAsync();
            }
            if (!await context.ShiftTemplates.AnyAsync())
            {
                var s1 = await context.WorkShifts.FirstAsync(s => s.ShiftCode == "S1");
                var c1 = await context.WorkShifts.FirstAsync(s => s.ShiftCode == "C1");
                var d1 = await context.WorkShifts.FirstAsync(s => s.ShiftCode == "D1");

                var template = new ShiftTemplate
                {
                    TemplateName = "Xoay ca 2-2-2 (S-C-D-O)",
                    CycleDays = 8,
                    OrganizationId = org.Id,
                    Details = new List<ShiftTemplateDetail>
                    {
                        new ShiftTemplateDetail { DayNumber = 1, WorkShiftId = s1.Id },
                        new ShiftTemplateDetail { DayNumber = 2, WorkShiftId = s1.Id },
                        new ShiftTemplateDetail { DayNumber = 3, WorkShiftId = c1.Id },
                        new ShiftTemplateDetail { DayNumber = 4, WorkShiftId = c1.Id },
                        new ShiftTemplateDetail { DayNumber = 5, WorkShiftId = d1.Id },
                        new ShiftTemplateDetail { DayNumber = 6, WorkShiftId = d1.Id },
                        new ShiftTemplateDetail { DayNumber = 7, WorkShiftId = null }, // OFF
                        new ShiftTemplateDetail { DayNumber = 8, WorkShiftId = null }  // OFF
                    }
                };
                context.ShiftTemplates.Add(template);
                await context.SaveChangesAsync();
            }
        }
    }
}
