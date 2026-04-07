using AutoMapper;
using HRMS.Application.DTOs.Scheduling;
using HRMS.Application.Interfaces;
using HRMS.Domain.Entities;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace HRMS.Infrastructure.Services
{
    public class WorkScheduleService : IWorkScheduleService
    {
        private readonly HRMSDbContext _context;
        private readonly IMapper _mapper;

        public WorkScheduleService(HRMSDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<IEnumerable<WorkScheduleMatrixDto>> GetMatrixAsync(int periodId, System.Security.Claims.ClaimsPrincipal user, int? deptId)
        {
            var period = await _context.SchedulePeriods.FindAsync(periodId);
            if (period == null) throw new KeyNotFoundException("Không tìm thấy kỳ công");

            var employeesQuery = _context.Employees
                .Include(e => e.Department)
                .Include(e => e.Position)
                .AsQueryable();

            if (user.IsInRole("DepartmentHead") && !user.IsInRole("Admin") && !user.IsInRole("HrAdmin"))
            {
                var deptIdString = user.FindFirst("DepartmentId")?.Value;
                var employeeIdString = user.FindFirst("EmployeeId")?.Value;
                
                Console.WriteLine($"[DEBUG] GetMatrix: Role=DepartmentHead, DeptId={deptIdString}, EmpId={employeeIdString}");

                if (int.TryParse(deptIdString, out int deptIdStr))
                {
                    // For DepartmentHead: Strictly filter by DepartmentId
                    employeesQuery = employeesQuery.Where(e => e.DepartmentId == deptIdStr);

                    // Exclude the Department Head themselves from the list
                    if (!string.IsNullOrEmpty(employeeIdString) && int.TryParse(employeeIdString, out int employeeId))
                    {
                        employeesQuery = employeesQuery.Where(e => e.Id != employeeId);
                    }
                    else 
                    {
                         // Fallback: If EmployeeId claim is missing, try to find by username
                         var username = user.Identity?.Name;
                         if (!string.IsNullOrEmpty(username))
                         {
                             employeesQuery = employeesQuery.Where(e => e.User.Username != username);
                         }
                    }
                }
                else return new List<WorkScheduleMatrixDto>();
            }
            else if (deptId.HasValue)
            {
                // For Admin/HrAdmin: Use department filter if provided
                employeesQuery = employeesQuery.Where(e => e.DepartmentId == deptId.Value);
            }

            var employees = await employeesQuery
                .OrderBy(e => e.FullName)
                .ToListAsync();
            
            var schedules = await _context.WorkSchedules
                .Include(s => s.WorkShift)
                .Where(s => s.PeriodId == periodId)
                .ToListAsync();

            var matrix = new List<WorkScheduleMatrixDto>();
            
            // Days in period
            var dates = Enumerable.Range(0, (period.EndDate - period.StartDate).Days + 1)
                .Select(d => period.StartDate.AddDays(d))
                .ToList();

            foreach (var emp in employees)
            {
                var empSchedules = schedules.Where(s => s.EmployeeId == emp.Id).ToList();
                var row = new WorkScheduleMatrixDto
                {
                    EmployeeId = emp.Id,
                    FullName = emp.FullName,
                    EmployeeCode = emp.EmployeeCode,
                    PositionName = emp.Position?.PositionName,
                    DepartmentName = emp.Department?.DepartmentName,
                    Schedules = dates.Select(date =>
                    {
                        var s = empSchedules.FirstOrDefault(x => x.WorkingDate.Date == date.Date);
                        return new WorkScheduleDayDto
                        {
                            Date = date,
                            ShiftId = s?.WorkShiftId,
                            ShiftCode = s?.WorkShift != null ? s.WorkShift.ShiftCode : (s != null ? "OFF" : ""),
                            IsLocked = period.IsLocked
                        };
                    }).ToList()
                };
                matrix.Add(row);
            }

            return matrix;
        }

        public async Task<WorkScheduleMatrixDto> GetPersonalScheduleAsync(int periodId, System.Security.Claims.ClaimsPrincipal user)
        {
            var employeeIdString = user.FindFirst("EmployeeId")?.Value;
            if (string.IsNullOrEmpty(employeeIdString) || !int.TryParse(employeeIdString, out int employeeId))
            {
                // Fallback: If EmployeeId is missing from claims, find by username
                var username = user.Identity?.Name;
                var emp = await _context.Employees.FirstOrDefaultAsync(e => e.User.Username == username);
                if (emp == null) throw new UnauthorizedAccessException("Không xác định được thông tin nhân viên.");
                employeeId = emp.Id;
            }

            var period = await _context.SchedulePeriods.FindAsync(periodId);
            if (period == null) throw new KeyNotFoundException("Kỳ công không tồn tại.");

            var employee = await _context.Employees
                .Include(e => e.Department)
                .Include(e => e.Position)
                .FirstOrDefaultAsync(e => e.Id == employeeId);

            if (employee == null) throw new KeyNotFoundException("Không tìm thấy dữ liệu nhân viên.");

            var schedules = await _context.WorkSchedules
                .Include(s => s.WorkShift)
                .Where(s => s.EmployeeId == employeeId && s.PeriodId == periodId)
                .ToListAsync();

            var dates = Enumerable.Range(0, (period.EndDate - period.StartDate).Days + 1)
                .Select(d => period.StartDate.AddDays(d))
                .ToList();

            return new WorkScheduleMatrixDto
            {
                EmployeeId = employee.Id,
                EmployeeCode = employee.EmployeeCode,
                FullName = employee.FullName,
                DepartmentName = employee.Department?.DepartmentName ?? "N/A",
                PositionName = employee.Position?.PositionName ?? "N/A",
                Schedules = dates.Select(date =>
                {
                    var s = schedules.FirstOrDefault(sh => sh.WorkingDate.Date == date.Date);
                    return new WorkScheduleDayDto
                    {
                        Date = date,
                        ShiftId = s?.WorkShiftId,
                        ShiftCode = s?.WorkShift != null ? s.WorkShift.ShiftCode : (s != null ? "OFF" : ""),
                        IsLocked = period.IsLocked
                    };
                }).ToList()
            };
        }

        public async Task BulkAssignAsync(BulkAssignDto dto, System.Security.Claims.ClaimsPrincipal user)
        {
            if (dto.EmployeeIds == null || !dto.EmployeeIds.Any())
                return;

            if (user.IsInRole("DepartmentHead") && !user.IsInRole("Admin") && !user.IsInRole("HrAdmin"))
            {
                var deptIdString = user.FindFirst("DepartmentId")?.Value;
                if (int.TryParse(deptIdString, out int deptIdStr))
                {
                    var validEmployeesCount = await _context.Employees
                        .CountAsync(e => e.DepartmentId == deptIdStr && dto.EmployeeIds.Contains(e.Id));
                        
                    if (validEmployeesCount != dto.EmployeeIds.Distinct().Count())
                    {
                        throw new UnauthorizedAccessException("Bạn chỉ được phân ca cho nhân viên thuộc bộ phận của mình.");
                    }
                }
            }

            var period = await _context.SchedulePeriods.FindAsync(dto.PeriodId);
            if (period == null || period.IsLocked)
                throw new InvalidOperationException("Kỳ công không tồn tại hoặc đã bị khóa");

            var startDate = dto.FromDate.Date;
            var endDate = dto.ToDate.Date;

            // Validation: Range bounds

            var totalDays = (endDate - startDate).Days + 1;
            if (totalDays <= 0)
                throw new ArgumentException("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu");
        
            if (totalDays > 31)
                throw new ArgumentException("Chỉ được xếp ca tối đa 31 ngày một lần");

            var dates = Enumerable.Range(0, totalDays)
                .Select(d => startDate.AddDays(d))
                .ToList();

            // DEDUPLICATION: Ensure each employee is processed only once
            var uniqueEmployeeIds = dto.EmployeeIds.Distinct().ToList();

            // OPTIMIZATION: Fetch all existing schedules for these employees in this date range in ONE query
            var existingSchedules = await _context.WorkSchedules
                .Where(s => uniqueEmployeeIds.Contains(s.EmployeeId) && 
                            s.WorkingDate >= startDate && 
                            s.WorkingDate <= endDate)
                .ToListAsync();

            foreach (var empId in uniqueEmployeeIds)
            {
                foreach (var date in dates)
                {
                    // Validation: Do not schedule for past dates
                    if (date < DateTime.Today) continue;

                    // Sunday (CN) Logic: 
                    // If assigning a shift, Sunday should ALWAYs be NULL (OFF) as per requirement.
                    // If shiftId is already null (Resetting), then Sunday also remains NULL.
                    var shiftToAssign = (date.DayOfWeek == DayOfWeek.Sunday) ? null : dto.ShiftId;

                    var existing = existingSchedules
                        .FirstOrDefault(s => s.EmployeeId == empId && s.WorkingDate.Date == date.Date);

                    if (existing != null)
                    {
                        existing.WorkShiftId = shiftToAssign;
                        existing.UpdatedAt = DateTime.UtcNow;
                        existing.PeriodId = dto.PeriodId;
                        
                        // ✅ FIX: Đảm bảo Note không bị NULL
                        if (string.IsNullOrEmpty(existing.Note))
                        {
                            existing.Note = string.Empty;
                        }
                    }
                    else
                    {
                        _context.WorkSchedules.Add(new WorkSchedule
                        {
                            EmployeeId = empId,
                            WorkShiftId = shiftToAssign,
                            WorkingDate = date,
                            PeriodId = dto.PeriodId,
                            UpdatedAt = DateTime.UtcNow,
                            Note = string.Empty // ✅ FIX: Thêm giá trị mặc định cho Note
                        });
                    }
                }
            }

            Console.WriteLine($"[DEBUG] BulkAssign: Saving changes to DB for {uniqueEmployeeIds.Count} emps across {dates.Count} days");
            await _context.SaveChangesAsync();
        }

        public async Task CopyPreviousMonthAsync(CopyScheduleDto dto, System.Security.Claims.ClaimsPrincipal user)
        {
            var targetPeriod = await _context.SchedulePeriods.FindAsync(dto.TargetPeriodId);
            if (targetPeriod == null || targetPeriod.IsLocked)
                throw new InvalidOperationException("Kỳ đích không tồn tại hoặc đã bị khóa");

            var sourceSchedules = await _context.WorkSchedules
                .Where(s => s.PeriodId == dto.SourcePeriodId)
                .ToListAsync();

            if (user.IsInRole("DepartmentHead") && !user.IsInRole("Admin") && !user.IsInRole("HrAdmin"))
            {
                var deptIdString = user.FindFirst("DepartmentId")?.Value;
                if (int.TryParse(deptIdString, out int deptIdStr))
                {
                    var empIds = await _context.Employees
                        .Where(e => e.DepartmentId == deptIdStr)
                        .Select(e => e.Id)
                        .ToListAsync();
                    sourceSchedules = sourceSchedules.Where(s => empIds.Contains(s.EmployeeId)).ToList();
                }
            }
            else if (dto.DepartmentId.HasValue)
            {
                var empIds = await _context.Employees
                    .Where(e => e.DepartmentId == dto.DepartmentId.Value)
                    .Select(e => e.Id)
                    .ToListAsync();
                sourceSchedules = sourceSchedules.Where(s => empIds.Contains(s.EmployeeId)).ToList();
            }

            foreach (var source in sourceSchedules)
            {
                // Simple logic: Copy by Day of Month
                var day = source.WorkingDate.Day;
                if (day > DateTime.DaysInMonth(targetPeriod.StartDate.Year, targetPeriod.StartDate.Month))
                    continue;

                var targetDate = new DateTime(targetPeriod.StartDate.Year, targetPeriod.StartDate.Month, day);

                // Validation: Do not copy to past dates
                if (targetDate < DateTime.Today) continue;

                // Sunday (CN) auto-off logic: Skip copying to Sundays
                if (targetDate.DayOfWeek == DayOfWeek.Sunday) continue;

                var existing = await _context.WorkSchedules
                    .FirstOrDefaultAsync(s => s.EmployeeId == source.EmployeeId && s.WorkingDate.Date == targetDate.Date);

                if (existing != null)
                {
                    existing.WorkShiftId = source.WorkShiftId;
                    existing.UpdatedAt = DateTime.UtcNow;
                    
                    // ✅ FIX: Copy Note hoặc đảm bảo không NULL
                    existing.Note = source.Note ?? string.Empty;
                }
                else
                {
                    _context.WorkSchedules.Add(new WorkSchedule
                    {
                        EmployeeId = source.EmployeeId,
                        WorkShiftId = source.WorkShiftId,
                        WorkingDate = targetDate,
                        PeriodId = dto.TargetPeriodId,
                        UpdatedAt = DateTime.UtcNow,
                        Note = source.Note ?? string.Empty // ✅ FIX: Copy Note hoặc gán rỗng
                    });
                }
            }

            await _context.SaveChangesAsync();
        }

        public async Task ApplyTemplateAsync(ApplyTemplateDto dto, System.Security.Claims.ClaimsPrincipal user)
        {
            if (user.IsInRole("DepartmentHead") && !user.IsInRole("Admin") && !user.IsInRole("HrAdmin"))
            {
                var deptIdString = user.FindFirst("DepartmentId")?.Value;
                if (int.TryParse(deptIdString, out int deptIdStr))
                {
                    var isDeptMember = await _context.Employees.AnyAsync(e => e.Id == dto.EmployeeId && e.DepartmentId == deptIdStr);
                    if (!isDeptMember)
                    {
                        throw new UnauthorizedAccessException("Bạn chỉ được áp dụng mẫu ca cho nhân viên thuộc bộ phận của mình.");
                    }
                }
            }
            var period = await _context.SchedulePeriods.FindAsync(dto.PeriodId);
            if (period == null || period.IsLocked)
                throw new InvalidOperationException("Kỳ công không tồn tại hoặc đã bị khóa");

            var template = await _context.ShiftTemplates
                .Include(t => t.Details)
                .FirstOrDefaultAsync(t => t.Id == dto.TemplateId);
                
            if (template == null) throw new KeyNotFoundException("Không tìm thấy mẫu ca");

            var dates = Enumerable.Range(0, (period.EndDate - period.StartDate).Days + 1)
                .Select(d => period.StartDate.AddDays(d))
                .ToList();

            foreach (var date in dates)
            {
                int diffDays = (date.Date - dto.StartDate.Date).Days;
                if (diffDays < 0) continue; // Skip dates before template start

                int dayInCycle = (diffDays % template.CycleDays) + 1;
                var detail = template.Details.FirstOrDefault(d => d.DayNumber == dayInCycle);

                // Sunday (CN) auto-off logic: Skip applying templates to Sundays
                if (date.DayOfWeek == DayOfWeek.Sunday) continue;

                var existing = await _context.WorkSchedules
                    .FirstOrDefaultAsync(s => s.EmployeeId == dto.EmployeeId && s.WorkingDate.Date == date.Date);

                if (existing != null)
                {
                    existing.WorkShiftId = detail?.WorkShiftId;
                    existing.UpdatedAt = DateTime.UtcNow;
                    
                    // ✅ FIX: Đảm bảo Note không NULL
                    if (string.IsNullOrEmpty(existing.Note))
                    {
                        existing.Note = string.Empty;
                    }
                }
                else
                {
                    _context.WorkSchedules.Add(new WorkSchedule
                    {
                        EmployeeId = dto.EmployeeId,
                        WorkShiftId = detail?.WorkShiftId,
                        WorkingDate = date,
                        PeriodId = dto.PeriodId,
                        UpdatedAt = DateTime.UtcNow,
                        Note = string.Empty // ✅ FIX: Thêm giá trị mặc định
                    });
                }
            }

            await _context.SaveChangesAsync();
        }

        public async Task LockPeriodAsync(int periodId)
        {
            var period = await _context.SchedulePeriods.FindAsync(periodId);
            if (period != null)
            {
                period.IsLocked = true;
                await _context.SaveChangesAsync();
            }
        }

        public async Task UnlockPeriodAsync(int periodId)
        {
            var period = await _context.SchedulePeriods.FindAsync(periodId);
            if (period != null)
            {
                period.IsLocked = false;
                await _context.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<SchedulePeriodDto>> GetPeriodsAsync(int organizationId)
        {
            var periods = await _context.SchedulePeriods
                .Where(p => p.OrganizationId == organizationId)
                .OrderByDescending(p => p.StartDate)
                .ToListAsync();
            return _mapper.Map<IEnumerable<SchedulePeriodDto>>(periods);
        }

        public async Task<int> CreatePeriodAsync(SchedulePeriodCreateDto dto)
        {
            var period = _mapper.Map<SchedulePeriod>(dto);
            _context.SchedulePeriods.Add(period);
            await _context.SaveChangesAsync();
            return period.Id;
        }

        public async Task<IEnumerable<ShiftTemplateDto>> GetTemplatesAsync(int organizationId)
        {
            var templates = await _context.ShiftTemplates
                .Include(t => t.Details)
                    .ThenInclude(d => d.WorkShift)
                .Where(t => t.OrganizationId == organizationId)
                .ToListAsync();

            return _mapper.Map<IEnumerable<ShiftTemplateDto>>(templates);
        }

        public async Task<AutoScheduleResultDto> AutoScheduleDepartmentAsync(AutoScheduleDeptDto dto, System.Security.Claims.ClaimsPrincipal user)
        {
            // ─── 1. Validate Authorization ────────────────────────────────────────────
            if (user.IsInRole("DepartmentHead") && !user.IsInRole("Admin") && !user.IsInRole("HrAdmin"))
            {
                var claimDeptId = user.FindFirst("DepartmentId")?.Value;
                if (!int.TryParse(claimDeptId, out int myDeptId) || myDeptId != dto.DepartmentId)
                    throw new UnauthorizedAccessException("Bạn chỉ được xếp ca tự động cho bộ phận của mình.");
            }

            // ─── 2. Validate Shifts ───────────────────────────────────────────────────
            var shiftIds = new[] { dto.Shift1Id, dto.Shift2Id, dto.Shift3Id };
            var validShiftCount = await _context.WorkShifts.CountAsync(s => shiftIds.Contains(s.Id));
            if (validShiftCount < 3)
                throw new ArgumentException("Một hoặc nhiều ca làm việc không tồn tại. Vui lòng kiểm tra Ca 1, Ca 2, Ca 3.");

            // ─── 3. Validate Department & Employees ──────────────────────────────────
            var department = await _context.Departments.FindAsync(dto.DepartmentId)
                ?? throw new KeyNotFoundException($"Phòng ban ID {dto.DepartmentId} không tồn tại.");
            var employeeIds = await _context.Employees
                .Where(e => e.DepartmentId == dto.DepartmentId)
                .Select(e => e.Id)
                .ToListAsync();
            if (!employeeIds.Any())
                throw new InvalidOperationException($"Phòng ban '{department.DepartmentName}' chưa có nhân viên nào.");

            // ─── 4. Validate year & CycleStartDate ───────────────────────────────────
            var cycleStart = dto.CycleStartDate.Date;
            var yearStart = new DateTime(dto.Year, 1, 1).Date;
            var yearEnd = new DateTime(dto.Year, 12, 31).Date;
            
            var effectiveStart = cycleStart; 
            if (effectiveStart < yearStart) effectiveStart = yearStart;
            
            if (effectiveStart > yearEnd)
                throw new InvalidOperationException("Ngày bắt đầu xếp ca đã nằm ngoài năm được chọn.");

            // ─── 5. Find all SchedulePeriods in the target year covering our range ────
            // Removing OrganizationId filter as periods may be shared across the system
            var periodsInYear = await _context.SchedulePeriods
                .Where(p => p.StartDate.Year <= dto.Year && p.EndDate.Year >= dto.Year
                         && p.EndDate >= effectiveStart)
                .OrderBy(p => p.StartDate)
                .ToListAsync();

            Console.WriteLine($"[AUTO_SCHEDULE] Found {periodsInYear.Count} periods for year {dto.Year}. Start range: {effectiveStart:yyyy-MM-dd}");

            if (!periodsInYear.Any())
                throw new InvalidOperationException($"Không tìm thấy kỳ công nào cho năm {dto.Year}. Vui lòng tạo kỳ công trước.");

            var lockedCount = periodsInYear.Count(p => p.IsLocked);

            // ─── 6. Shift Mapper ──────────────────────────────────────────────────────
            int? GetShiftForDate(DateTime date)
            {
                if (date.DayOfWeek == DayOfWeek.Sunday) return null;
                int daysSinceCycle = (date.Date - cycleStart).Days;
                int normalized = ((daysSinceCycle % 56) + 56) % 56;
                int weekInCycle = (normalized / 7) + 1;
                return weekInCycle switch
                {
                    1 or 2 => dto.Shift1Id,
                    3 or 4 => dto.Shift2Id,
                    5 or 6 => dto.Shift3Id,
                    7 or 8 => dto.Shift1Id,
                    _ => dto.Shift1Id
                };
            }

            // ─── 7. Apply across each period ─────────────────────────────────────────
            int scheduled = 0, skipped = 0;

            foreach (var period in periodsInYear)
            {
                if (period.IsLocked) continue;

                var pStart = period.StartDate.Date > effectiveStart ? period.StartDate.Date : effectiveStart;
                var pEnd = period.EndDate.Date < yearEnd ? period.EndDate.Date : yearEnd;
                if (pStart > pEnd) continue;

                var datesInPeriod = Enumerable.Range(0, (pEnd - pStart).Days + 1)
                    .Select(d => pStart.AddDays(d))
                    .ToList();

                var existingSchedules = await _context.WorkSchedules
                    .Where(s => employeeIds.Contains(s.EmployeeId)
                             && s.WorkingDate >= pStart
                             && s.WorkingDate <= pEnd)
                    .ToListAsync();

                Console.WriteLine($"[AUTO_SCHEDULE] Processing Period {period.PeriodName} ({pStart:dd/MM} to {pEnd:dd/MM}) for {employeeIds.Count} employees.");

                foreach (var empId in employeeIds)
                {
                    foreach (var date in datesInPeriod)
                    {
                        var targetShiftId = GetShiftForDate(date);
                        var existing = existingSchedules
                            .FirstOrDefault(s => s.EmployeeId == empId && s.WorkingDate.Date == date.Date);

                        if (existing != null)
                        {
                            if (existing.WorkShiftId != null && !dto.OverwriteExisting) 
                            { 
                                skipped++; continue; 
                            }
                            
                            existing.WorkShiftId = targetShiftId;
                            existing.UpdatedAt = DateTime.UtcNow;
                            existing.Note ??= string.Empty;
                            scheduled++;
                        }
                        else
                        {
                            _context.WorkSchedules.Add(new WorkSchedule
                            {
                                EmployeeId = empId,
                                WorkShiftId = targetShiftId,
                                WorkingDate = date,
                                PeriodId = period.Id,
                                UpdatedAt = DateTime.UtcNow,
                                Note = string.Empty
                            });
                            scheduled++;
                        }
                    }
                }

                await _context.SaveChangesAsync();
            }

            return new AutoScheduleResultDto
            {
                ScheduledDays = scheduled,
                ScheduledEmployees = employeeIds.Count,
                SkippedDays = skipped,
                Message = $"Xếp ca thành công cho {employeeIds.Count} nhân viên, {scheduled} ngày công trong năm {dto.Year}." +
                          (skipped > 0 ? $" Bỏ qua {skipped} ngày đã có sẵn ca." : "") +
                          (lockedCount > 0 ? $" Bỏ qua {lockedCount} kỳ đã bị khóa." : "")
            };
        }
    }
}