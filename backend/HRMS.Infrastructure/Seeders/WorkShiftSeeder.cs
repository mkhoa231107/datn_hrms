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
                (Code: "C1", Name: "Ca 1 (Sáng)", Start: new TimeSpan(6, 0, 0), End: new TimeSpan(14, 0, 0), Break: 30, Overnight: false),
                (Code: "C2", Name: "Ca 2 (Chiều)", Start: new TimeSpan(14, 0, 0), End: new TimeSpan(22, 0, 0), Break: 30, Overnight: false),
                (Code: "C3", Name: "Ca 3 (Đêm)",  Start: new TimeSpan(22, 0, 0), End: new TimeSpan(6, 0, 0), Break: 30, Overnight: true)
            };

            // 1. Cleanup: Handle dependencies and remove non-standard shifts
            var standardCodes = new[] { "HC", "C1", "C2", "C3" };
            var hcShift = await context.WorkShifts.FirstOrDefaultAsync(s => s.ShiftCode == "HC");

            // Identify IDs to remove
            var nonStandardShiftIds = await context.WorkShifts
                .Where(s => !standardCodes.Contains(s.ShiftCode))
                .Select(s => s.Id)
                .ToListAsync();

            if (nonStandardShiftIds.Any())
            {
                if (hcShift != null)
                {
                    // Update templates to use HC
                    await context.ShiftTemplateDetails
                        .Where(std => std.WorkShiftId.HasValue && nonStandardShiftIds.Contains(std.WorkShiftId.Value))
                        .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.WorkShiftId, (int?)hcShift.Id));

                    // Update contracts to use HC
                    await context.EmployeeContracts
                        .Where(c => c.ShiftId.HasValue && nonStandardShiftIds.Contains(c.ShiftId.Value))
                        .ExecuteUpdateAsync(setters => setters.SetProperty(c => c.ShiftId, (int?)hcShift.Id));

                    // Update employees to use HC
                    await context.Employees
                        .Where(e => e.ShiftId.HasValue && nonStandardShiftIds.Contains(e.ShiftId.Value))
                        .ExecuteUpdateAsync(setters => setters.SetProperty(e => e.ShiftId, (int?)hcShift.Id));

                    // Update positions to use HC
                    await context.Positions
                        .Where(p => p.DefaultShiftId.HasValue && nonStandardShiftIds.Contains(p.DefaultShiftId.Value))
                        .ExecuteUpdateAsync(setters => setters.SetProperty(p => p.DefaultShiftId, (int?)hcShift.Id));
                }
                else
                {
                    // If no HC, nullify everything
                    await context.ShiftTemplateDetails.Where(std => std.WorkShiftId.HasValue && nonStandardShiftIds.Contains(std.WorkShiftId.Value)).ExecuteUpdateAsync(s => s.SetProperty(x => x.WorkShiftId, (int?)null));
                    await context.EmployeeContracts.Where(c => c.ShiftId.HasValue && nonStandardShiftIds.Contains(c.ShiftId.Value)).ExecuteUpdateAsync(s => s.SetProperty(x => x.ShiftId, (int?)null));
                    await context.Employees.Where(e => e.ShiftId.HasValue && nonStandardShiftIds.Contains(e.ShiftId.Value)).ExecuteUpdateAsync(s => s.SetProperty(x => x.ShiftId, (int?)null));
                    await context.Positions.Where(p => p.DefaultShiftId.HasValue && nonStandardShiftIds.Contains(p.DefaultShiftId.Value)).ExecuteUpdateAsync(s => s.SetProperty(x => x.DefaultShiftId, (int?)null));
                }

                // Delete requests that point to these shifts (easier than nullifying complex state)
                await context.ShiftSwapRequests
                    .Where(r => (r.TargetShiftId.HasValue && nonStandardShiftIds.Contains(r.TargetShiftId.Value)))
                    .ExecuteDeleteAsync();
                
                await context.ShiftChangeRequests
                    .Where(r => nonStandardShiftIds.Contains(r.RequestedShiftId) || (r.CurrentShiftId.HasValue && nonStandardShiftIds.Contains(r.CurrentShiftId.Value)))
                    .ExecuteDeleteAsync();

                // Delete schedules using these shifts
                await context.WorkSchedules
                    .Where(ws => ws.WorkShiftId.HasValue && nonStandardShiftIds.Contains(ws.WorkShiftId.Value))
                    .ExecuteDeleteAsync();

                // Delete the shifts themselves
                await context.WorkShifts
                    .Where(s => nonStandardShiftIds.Contains(s.Id))
                    .ExecuteDeleteAsync();
            }

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
                var c1 = await context.WorkShifts.FirstAsync(s => s.ShiftCode == "C1");
                var c2 = await context.WorkShifts.FirstAsync(s => s.ShiftCode == "C2");
                var c3 = await context.WorkShifts.FirstAsync(s => s.ShiftCode == "C3");

                var template = new ShiftTemplate
                {
                    TemplateName = "Xoay ca 2-2-2 (C1-C2-C3)",
                    CycleDays = 8,
                    OrganizationId = org.Id,
                    Details = new List<ShiftTemplateDetail>
                    {
                        new ShiftTemplateDetail { DayNumber = 1, WorkShiftId = c1.Id },
                        new ShiftTemplateDetail { DayNumber = 2, WorkShiftId = c1.Id },
                        new ShiftTemplateDetail { DayNumber = 3, WorkShiftId = c2.Id },
                        new ShiftTemplateDetail { DayNumber = 4, WorkShiftId = c2.Id },
                        new ShiftTemplateDetail { DayNumber = 5, WorkShiftId = c3.Id },
                        new ShiftTemplateDetail { DayNumber = 6, WorkShiftId = c3.Id },
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
