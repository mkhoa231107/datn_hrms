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

            var shiftDefs = new[] {
                (Code: "HC", Name: "Hành chính", Start: new TimeSpan(8, 0, 0), End: new TimeSpan(17, 30, 0), Break: 90, Overnight: false),
                (Code: "S1", Name: "Ca 1",     Start: new TimeSpan(6, 0, 0), End: new TimeSpan(14, 0, 0), Break: 30, Overnight: false),
                (Code: "C1", Name: "Ca 2",     Start: new TimeSpan(14, 0, 0), End: new TimeSpan(22, 0, 0), Break: 30, Overnight: false),
                (Code: "D1", Name: "Ca 3",       Start: new TimeSpan(22, 0, 0), End: new TimeSpan(6, 0, 0), Break: 30, Overnight: true)
            };

            // 1. Cleanup: Handle dependencies and remove non-standard shifts
            var allShifts = await context.WorkShifts.ToListAsync();
            var standardCodes = new[] { "HC", "S1", "C1", "D1" };
            var hcShift = allShifts.FirstOrDefault(s => s.ShiftCode == "HC");

            foreach (var s in allShifts)
            {
                if (!standardCodes.Contains(s.ShiftCode))
                {
                    // Update ShiftTemplateDetails to use HC shift instead of deleting them to avoid FK errors
                    var templates = await context.ShiftTemplateDetails.Where(std => std.WorkShiftId == s.Id).ToListAsync();
                    if (hcShift != null)
                    {
                        foreach (var t in templates) t.WorkShiftId = hcShift.Id;
                    }
                    else
                    {
                        context.ShiftTemplateDetails.RemoveRange(templates);
                    }

                    // Also cleanup WorkSchedules using this shift
                    var schedules = await context.WorkSchedules.Where(ws => ws.WorkShiftId == s.Id).ToListAsync();
                    context.WorkSchedules.RemoveRange(schedules);

                    context.WorkShifts.Remove(s);
                }
            }
            await context.SaveChangesAsync();

            // 2. Ensure standard shifts exist with correct names
            foreach (var (code, name, start, end, breakMin, overnight) in shiftDefs)
            {
                var existing = await context.WorkShifts.FirstOrDefaultAsync(s => s.ShiftCode == code);
                if (existing == null)
                {
                    context.WorkShifts.Add(new WorkShift { 
                        ShiftName = name, 
                        ShiftCode = code, 
                        StartTime = start, 
                        EndTime = end, 
                        BreakMinutes = breakMin, 
                        IsOvernight = overnight,
                        OrganizationId = org.Id 
                    });
                }
                else 
                {
                    existing.ShiftName = name; // Update name to Ca 1, Ca 2, Ca 3
                    existing.StartTime = start;
                    existing.EndTime = end;
                }
            }
            await context.SaveChangesAsync();

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
