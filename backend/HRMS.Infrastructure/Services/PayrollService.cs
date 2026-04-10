using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using HRMS.Application.DTOs.Payroll;
using HRMS.Application.Interfaces;
using HRMS.Domain.Entities;
using HRMS.Domain.Enums;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HRMS.Infrastructure.Services
{
    public class PayrollService : IPayrollService
    {
        private readonly HRMSDbContext _context;
        private readonly IMapper _mapper;

        public PayrollService(HRMSDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<PayrollSettingDto> GetCurrentSettingsAsync(int organizationId)
        {
            var settings = await _context.PayrollSettings
                .Where(s => s.OrganizationId == organizationId)
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();

            if (settings == null)
            {
                // Return default settings if none exist
                return new PayrollSettingDto
                {
                    SocialInsuranceRate = 8.0m,
                    HealthInsuranceRate = 1.5m,
                    UnemploymentInsuranceRate = 1.0m,
                    PersonalDeductionAmount = 11000000m,
                    DependentDeductionAmount = 4400000m,
                    CommonBaseSalary = 1800000m,
                    RegionBaseSalary = 4680000m
                };
            }

            return _mapper.Map<PayrollSettingDto>(settings);
        }

        public async Task UpdateSettingsAsync(int organizationId, PayrollSettingDto dto)
        {
            var settings = new PayrollSetting
            {
                OrganizationId = organizationId,
                SocialInsuranceRate = dto.SocialInsuranceRate,
                HealthInsuranceRate = dto.HealthInsuranceRate,
                UnemploymentInsuranceRate = dto.UnemploymentInsuranceRate,
                PersonalDeductionAmount = dto.PersonalDeductionAmount,
                DependentDeductionAmount = dto.DependentDeductionAmount,
                CommonBaseSalary = dto.CommonBaseSalary,
                RegionBaseSalary = dto.RegionBaseSalary,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            // Deactivate old settings
            var oldSettings = await _context.PayrollSettings
                .Where(s => s.OrganizationId == organizationId && s.IsActive)
                .ToListAsync();
            foreach (var old in oldSettings) old.IsActive = false;

            _context.PayrollSettings.Add(settings);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<EmployeePayrollProfileDto>> GetEmployeePayrollProfilesAsync(int? departmentId = null)
        {
            var query = _context.Employees
                .Include(e => e.Department)
                .Include(e => e.Position)
                .Where(e => e.IsActive && !e.Position.PositionName.Contains("Trưởng"))
                .AsQueryable();

            if (departmentId.HasValue)
            {
                var departmentIds = await GetDepartmentIdsRecursively(departmentId.Value);
                query = query.Where(e => departmentIds.Contains(e.DepartmentId));
            }

            var employees = await query.ToListAsync();

            return employees.Select(e => {
                return new EmployeePayrollProfileDto {
                    EmployeeId = e.Id,
                    FullName = e.FullName,
                    EmployeeCode = e.EmployeeCode,
                    DepartmentId = e.DepartmentId,
                    DepartmentName = e.Department?.DepartmentName ?? "N/A",
                    PositionName = e.Position?.PositionName ?? "N/A",
                    WorkingStatus = e.Status == EmployeeStatus.Active ? "Đang làm việc" : 
                                    e.Status == EmployeeStatus.Probation ? "Thử việc" : "Nghỉ việc",
                    Email = e.Email,
                    BasicSalary = e.BasicSalary,
                    InsuranceSalary = e.InsuranceSalary,
                    NumberOfDependents = e.NumberOfDependents
                };
            });
        }

        public async Task UpdateEmployeePayrollProfileAsync(int employeeId, EmployeePayrollUpdateDto dto)
        {
            var employee = await _context.Employees.FindAsync(employeeId);
            if (employee == null) throw new KeyNotFoundException("Employee not found");

            employee.InsuranceSalary = dto.InsuranceSalary;
            employee.NumberOfDependents = dto.NumberOfDependents;
            employee.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<PayrollPeriodDto>> GetPayrollPeriodsAsync()
        {
            var periods = await _context.PayrollPeriods
                .Include(p => p.SchedulePeriod)
                .Include(p => p.ProcessedBy)
                .Include(p => p.ReviewedBy)
                .Include(p => p.ApprovedBy)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return periods.Select(p => new PayrollPeriodDto {
                Id = p.Id,
                Name = p.Name,
                Status = p.Status.ToString(),
                SchedulePeriodId = p.SchedulePeriodId,
                SchedulePeriodName = p.SchedulePeriod?.PeriodName ?? "N/A",
                ProcessedByName = p.ProcessedBy?.FullName,
                ReviewedByName = p.ReviewedBy?.FullName,
                ReviewedAt = p.ReviewedAt,
                ApprovedByName = p.ApprovedBy?.FullName,
                ApprovedAt = p.ApprovedAt,
                CreatedAt = p.CreatedAt
            });
        }

        public async Task<PayrollPeriodDto> CreatePayrollPeriodAsync(CreatePayrollPeriodDto dto)
        {
            var period = new PayrollPeriod {
                Name = dto.Name,
                SchedulePeriodId = dto.SchedulePeriodId,
                Status = PayrollStatus.Open,
                CreatedAt = DateTime.UtcNow
            };

            _context.PayrollPeriods.Add(period);
            await _context.SaveChangesAsync();
            
            return (await GetPayrollPeriodsAsync()).First(p => p.Id == period.Id);
        }

        public async Task CalculatePayrollAsync(int periodId, int userId)
        {
            var period = await _context.PayrollPeriods
                .Include(p => p.SchedulePeriod)
                .FirstOrDefaultAsync(p => p.Id == periodId);
            
            if (period == null) throw new KeyNotFoundException("Payroll Period not found");
            if (period.Status != PayrollStatus.Open) throw new InvalidOperationException("Period is not in Open status");

            var settings = await _context.PayrollSettings
                .Where(s => s.IsActive)
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync() ?? new PayrollSetting(); // Fallback to defaults

            // 1. Calculate Standard Working Days for the period (excluding Sundays)
            var schedulePeriod = await _context.SchedulePeriods.FindAsync(period.SchedulePeriodId);
            if (schedulePeriod == null) throw new InvalidOperationException("Schedule Period not found");
            
            int standardDays = GetStandardDays(schedulePeriod.StartDate, schedulePeriod.EndDate);
            var summaries = await _context.AttendanceSummaries
                .Include(asum => asum.Employee)
                    .ThenInclude(e => e.Position)
                .Where(asum => asum.PeriodId == period.SchedulePeriodId 
                    && asum.Status == TimesheetStatus.Approved
                    && !asum.Employee.Position.PositionName.Contains("Trưởng"))
                .ToListAsync();

            if (!summaries.Any())
            {
                var anySummaries = await _context.AttendanceSummaries.AnyAsync(s => s.PeriodId == period.SchedulePeriodId);
                if (!anySummaries)
                    throw new InvalidOperationException("Chưa có bảng tổng hợp công cho kỳ này. Vui lòng vào menu 'Công bộ phận' và nhấn 'Chốt & Tổng hợp công'.");
                else
                    throw new InvalidOperationException("Bảng công đã được tổng hợp nhưng CHƯA ĐƯỢC DUYỆT. Vui lòng vào 'Công bộ phận' và nhấn Duyệt (Dấu tích xanh) cho nhân viên.");
            }

            // Clear old records if any
            var oldRecords = await _context.PayrollRecords.Where(r => r.PayrollPeriodId == periodId).ToListAsync();
            _context.PayrollRecords.RemoveRange(oldRecords);

            foreach (var asum in summaries)
            {
                var emp = asum.Employee;
                var record = new PayrollRecord {
                    PayrollPeriodId = periodId,
                    EmployeeId = emp.Id,
                    BasicSalary = emp.BasicSalary,
                    CreatedAt = DateTime.UtcNow
                };

                // A. Base Income
                // Dùng AdjustedWorkingDays: đã bao gồm trừ penalty đi trễ/về sớm (0.5 ngày/vi phạm)
                decimal adjustedDays = asum.AdjustedWorkingDays > 0
                    ? asum.AdjustedWorkingDays
                    : asum.TotalWorkingDays; // fallback nếu chưa có AdjustedWorkingDays
                record.ActualWorkingSalary = (record.BasicSalary / standardDays) * Math.Min(adjustedDays, standardDays);
                
                // B. Overtime (Standard 150%)
                decimal hourlyRate = (record.BasicSalary / standardDays / 8);
                record.OvertimePay = hourlyRate * 1.5m * asum.OvertimeHours;

                // C. Allowances (Simplified: Zero out all allowances)
                record.PositionAllowance = 0;
                record.PetrolAllowance = 0;
                record.PhoneAllowance = 0;
                record.OtherAllowance = 0; 
                record.SalesSalary = 0;

                // D. Insurance (Employee part)
                decimal insuranceBase = emp.InsuranceSalary ?? record.BasicSalary;
                decimal siCap = settings.CommonBaseSalary * 20;
                decimal uiCap = settings.RegionBaseSalary * 20;

                decimal siBaseFinal = Math.Min(insuranceBase, siCap);
                decimal uiBaseFinal = Math.Min(insuranceBase, uiCap);

                record.SocialInsurance = siBaseFinal * (settings.SocialInsuranceRate / 100);
                record.HealthInsurance = siBaseFinal * (settings.HealthInsuranceRate / 100);
                record.UnemploymentInsurance = uiBaseFinal * (settings.UnemploymentInsuranceRate / 100);

                // E. Personal Income Tax (PIT) - Simplified: Zero out tax
                record.PersonalIncomeTax = 0; 

                // F. Final Calculation (Simplified Net = ActualSalary + OT - Insurance)
                record.Bonus = 0;
                record.OtherDeductions = 0;
                record.NetSalary = record.ActualWorkingSalary + record.OvertimePay 
                                 - (record.SocialInsurance + record.HealthInsurance + record.UnemploymentInsurance);
                
                _context.PayrollRecords.Add(record);
            }

            period.ProcessedById = (await _context.Employees.FirstOrDefaultAsync(e => e.UserId == userId))?.Id;
            period.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        private int GetStandardDays(DateTime start, DateTime end)
        {
            int count = 0;
            for (DateTime date = start.Date; date <= end.Date; date = date.AddDays(1))
            {
                if (date.DayOfWeek != DayOfWeek.Sunday)
                    count++;
            }
            return count > 0 ? count : 26; // Fallback to 26 if range is invalid
        }

        private decimal CalculatePIT(decimal taxableIncome)
        {
            if (taxableIncome <= 0) return 0;

            // Biểu thuế lũy tiến từng phần (7 bậc) theo quy định Việt Nam
            // Bậc 1: Đến 5 trđ x 5%
            if (taxableIncome <= 5000000) return taxableIncome * 0.05m;
            // Bậc 2: Trên 5 trđ đến 10 trđ x 10% - 0.25 trđ
            if (taxableIncome <= 10000000) return taxableIncome * 0.1m - 250000;
            // Bậc 3: Trên 10 trđ đến 18 trđ x 15% - 0.75 trđ
            if (taxableIncome <= 18000000) return taxableIncome * 0.15m - 750000;
            // Bậc 4: Trên 18 trđ đến 32 trđ x 20% - 1.65 trđ
            if (taxableIncome <= 32000000) return taxableIncome * 0.2m - 1650000;
            // Bậc 5: Trên 32 trđ đến 52 trđ x 25% - 3.25 trđ
            if (taxableIncome <= 52000000) return taxableIncome * 0.25m - 3250000;
            // Bậc 6: Trên 52 trđ đến 80 trđ x 30% - 5.85 trđ
            if (taxableIncome <= 80000000) return taxableIncome * 0.3m - 5850000;
            // Bậc 7: Trên 80 trđ x 35% - 9.85 trđ
            return taxableIncome * 0.35m - 9850000;
        }

        public async Task AdjustPayrollRecordAsync(int recordId, AdjustPayrollRecordDto dto)
        {
            var record = await _context.PayrollRecords
                .Include(r => r.PayrollPeriod)
                .FirstOrDefaultAsync(r => r.Id == recordId);

            if (record == null) throw new KeyNotFoundException("Record not found");
            if (record.PayrollPeriod.Status != PayrollStatus.Open && record.PayrollPeriod.Status != PayrollStatus.HR_Reviewing)
                throw new InvalidOperationException("Status does not allow adjustments");

            record.Bonus = dto.Bonus;
            record.OtherDeductions = dto.OtherDeductions;
            record.Note = dto.Note;
            
            // Re-calculate Net
            record.NetSalary = record.ActualWorkingSalary + record.OvertimePay + record.TotalAllowances + record.Bonus 
                             - (record.SocialInsurance + record.HealthInsurance + record.UnemploymentInsurance + record.PersonalIncomeTax + record.OtherDeductions);

            await _context.SaveChangesAsync();
        }

        public async Task ReviewPayrollAsync(int periodId, int userId)
        {
            var period = await _context.PayrollPeriods.FindAsync(periodId);
            if (period == null) throw new KeyNotFoundException("Period not found");
            
            var emp = await _context.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            period.ReviewedById = emp?.Id;
            period.ReviewedAt = DateTime.UtcNow;
            period.Status = PayrollStatus.HR_Reviewing;

            await _context.SaveChangesAsync();
        }

        public async Task ApprovePayrollAsync(int periodId, int userId)
        {
            var period = await _context.PayrollPeriods.FindAsync(periodId);
            if (period == null) throw new KeyNotFoundException("Period not found");

            var emp = await _context.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            period.ApprovedById = emp?.Id;
            period.ApprovedAt = DateTime.UtcNow;
            period.Status = PayrollStatus.Locked;

            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<PayrollRecordDto>> GetPayrollRecordsAsync(int periodId)
        {
            var records = await _context.PayrollRecords
                .Include(r => r.Employee)
                    .ThenInclude(e => e.Department)
                .Include(r => r.Employee)
                    .ThenInclude(e => e.Position)
                .Where(r => r.PayrollPeriodId == periodId)
                .ToListAsync();

            return records.Select(r => new PayrollRecordDto {
                Id = r.Id,
                EmployeeId = r.EmployeeId,
                EmployeeCode = r.Employee?.EmployeeCode ?? "N/A",
                EmployeeName = r.Employee?.FullName ?? "N/A",
                DepartmentName = r.Employee?.Department?.DepartmentName ?? "N/A",
                PositionName = r.Employee?.Position?.PositionName ?? "N/A",
                BasicSalary = r.BasicSalary,
                ActualWorkingSalary = r.ActualWorkingSalary,
                OvertimePay = r.OvertimePay,
                TotalAllowances = r.TotalAllowances,
                Bonus = r.Bonus,
                GrossSalary = r.GrossSalary,
                SocialInsurance = r.SocialInsurance,
                HealthInsurance = r.HealthInsurance,
                UnemploymentInsurance = r.UnemploymentInsurance,
                PersonalIncomeTax = r.PersonalIncomeTax,
                OtherDeductions = r.OtherDeductions,
                TotalDeductions = r.TotalDeductions,
                NetSalary = r.NetSalary,
                Note = r.Note
            });
        }

        public async Task<PayrollRecordDto> GetMyPayslipAsync(int employeeId, int periodId)
        {
            var record = await _context.PayrollRecords
                .Include(r => r.Employee)
                .FirstOrDefaultAsync(r => r.EmployeeId == employeeId && r.PayrollPeriodId == periodId);

            if (record == null) throw new KeyNotFoundException("Payslip not found");

            return (await GetPayrollRecordsAsync(periodId)).First(r => r.Id == record.Id);
        }

        public async Task AddEmployeesToPayrollAsync(int periodId, List<int> employeeIds)
        {
            var period = await _context.PayrollPeriods.FindAsync(periodId);
            if (period == null) throw new KeyNotFoundException("Period not found");

            var existingIds = await _context.PayrollRecords
                .Where(r => r.PayrollPeriodId == periodId)
                .Select(r => r.EmployeeId)
                .ToListAsync();

            var newIds = employeeIds.Except(existingIds).ToList();
            if (!newIds.Any()) return;

            var employees = await _context.Employees
                .Where(e => newIds.Contains(e.Id))
                .ToListAsync();

            foreach (var emp in employees)
            {
                var record = new PayrollRecord {
                    PayrollPeriodId = periodId,
                    EmployeeId = emp.Id,
                    BasicSalary = emp.BasicSalary,
                    PositionAllowance = 0,
                    PetrolAllowance = 0,
                    PhoneAllowance = 0,
                    OtherAllowance = 730000m, // Default Lunch
                    SalesSalary = 0,
                    Bonus = 0,
                    CreatedAt = DateTime.UtcNow
                };
                _context.PayrollRecords.Add(record);
            }

            await _context.SaveChangesAsync();
        }

        public async Task BulkUpdateRecordsAsync(int periodId, BulkUpdatePayrollRequest request)
        {
            foreach (var adj in request.Adjustments)
            {
                var record = await _context.PayrollRecords.FindAsync(adj.RecordId);
                if (record == null || record.PayrollPeriodId != periodId) continue;

                record.PositionAllowance = adj.PositionAllowance;
                record.PetrolAllowance = adj.PetrolAllowance;
                record.PhoneAllowance = adj.PhoneAllowance;
                record.OtherAllowance = adj.OtherAllowance;
                record.SalesSalary = adj.SalesSalary;
                record.Bonus = adj.Bonus;
            }

            await _context.SaveChangesAsync();
        }

        public async Task AggregatePayrollAsync(int periodId)
        {
            var period = await _context.PayrollPeriods
                .Include(p => p.SchedulePeriod)
                .FirstOrDefaultAsync(p => p.Id == periodId);
            
            if (period == null) throw new KeyNotFoundException("Period not found");

            var settings = await _context.PayrollSettings
                .Where(s => s.IsActive)
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync() ?? new PayrollSetting();

            int standardDays = GetStandardDays(period.SchedulePeriod.StartDate, period.SchedulePeriod.EndDate);
            
            var records = await _context.PayrollRecords
                .Include(r => r.Employee)
                    .ThenInclude(e => e.Position)
                .Where(r => r.PayrollPeriodId == periodId && !r.Employee.Position.PositionName.Contains("Trưởng"))
                .ToListAsync();

            foreach (var record in records)
            {
                var asum = await _context.AttendanceSummaries
                    .FirstOrDefaultAsync(a => a.PeriodId == period.SchedulePeriodId && a.EmployeeId == record.EmployeeId && a.Status == TimesheetStatus.Approved);

                decimal workingDays = asum?.TotalWorkingDays ?? 0;
                decimal otHours = asum?.OvertimeHours ?? 0;

                // 1. Working Salary (Pro-rated)
                // Dùng AdjustedWorkingDays: đã bao gồm trừ penalty đi trễ/về sớm (0.5 ngày/vi phạm)
                decimal adjustedWorkingDays = (asum?.AdjustedWorkingDays ?? 0) > 0
                    ? (asum?.AdjustedWorkingDays ?? 0)
                    : workingDays; // fallback nếu chưa có
                record.ActualWorkingSalary = (record.BasicSalary / standardDays) * Math.Min(adjustedWorkingDays, standardDays);
                
                // 2. Overtime
                decimal hourlyRate = (record.BasicSalary / standardDays / 8);
                record.OvertimePay = hourlyRate * 1.5m * otHours;

                // 3. Insurance
                decimal insuranceBase = record.Employee.InsuranceSalary ?? record.BasicSalary;
                decimal siCap = settings.CommonBaseSalary * 20;
                decimal uiCap = settings.RegionBaseSalary * 20;
                decimal siBaseFinal = Math.Min(insuranceBase, siCap);
                decimal uiBaseFinal = Math.Min(insuranceBase, uiCap);

                record.SocialInsurance = siBaseFinal * (settings.SocialInsuranceRate / 100);
                record.HealthInsurance = siBaseFinal * (settings.HealthInsuranceRate / 100);
                record.UnemploymentInsurance = uiBaseFinal * (settings.UnemploymentInsuranceRate / 100);

                // 4. Tax (Simplified: Zero out tax and allowances)
                record.PositionAllowance = 0;
                record.PetrolAllowance = 0;
                record.PhoneAllowance = 0;
                record.OtherAllowance = 0;
                record.SalesSalary = 0;
                record.Bonus = 0;
                record.PersonalIncomeTax = 0;

                // 5. Net Final (Simplified: Net = ActualSalary + OT - Insurance)
                record.NetSalary = record.ActualWorkingSalary + record.OvertimePay 
                                 - (record.SocialInsurance + record.HealthInsurance + record.UnemploymentInsurance);
            }

            await _context.SaveChangesAsync();
        }
        private async Task<List<int>> GetDepartmentIdsRecursively(int parentId)
        {
            var result = new List<int> { parentId };
            var children = await _context.Departments
                .Where(d => d.ParentDepartmentId == parentId && d.IsActive)
                .Select(d => d.Id)
                .ToListAsync();

            foreach (var childId in children)
            {
                result.AddRange(await GetDepartmentIdsRecursively(childId));
            }

            return result.Distinct().ToList();
        }

        // ===== NEW: Get employee profiles with attendance data for pre-calculation display =====
        public async Task<IEnumerable<EmployeePayrollProfileDto>> GetEmployeeProfilesWithAttendanceAsync(int departmentId, int schedulePeriodId)
        {
            var deptIds = await GetDepartmentIdsRecursively(departmentId);
            var employees = await _context.Employees
                .Include(e => e.Department)
                .Include(e => e.Position)
                .Where(e => deptIds.Contains(e.DepartmentId) && e.IsActive && !e.Position.PositionName.Contains("Trưởng"))
                .ToListAsync();

            var empIds = employees.Select(e => e.Id).ToList();
            var summaries = await _context.AttendanceSummaries
                .Where(s => s.PeriodId == schedulePeriodId && empIds.Contains(s.EmployeeId))
                .ToListAsync();

            var summaryMap = summaries.ToDictionary(s => s.EmployeeId);

            return employees.Select(e => {
                summaryMap.TryGetValue(e.Id, out var asum);
                return new EmployeePayrollProfileDto {
                    EmployeeId = e.Id,
                    FullName = e.FullName,
                    EmployeeCode = e.EmployeeCode,
                    DepartmentId = e.DepartmentId,
                    DepartmentName = e.Department?.DepartmentName ?? "N/A",
                    PositionName = e.Position?.PositionName ?? "N/A",
                    WorkingStatus = e.Status == EmployeeStatus.Active ? "Đang làm việc" :
                                    e.Status == EmployeeStatus.Probation ? "Thử việc" : "Nghỉ việc",
                    Email = e.Email,
                    BasicSalary = e.BasicSalary,
                    InsuranceSalary = e.InsuranceSalary,
                    NumberOfDependents = e.NumberOfDependents,
                    ActualWorkingDays = asum?.AdjustedWorkingDays ?? asum?.TotalWorkingDays ?? 0,
                    OvertimeHours = asum?.OvertimeHours ?? 0,
                    HasApprovedTimesheet = asum != null && asum.Status == TimesheetStatus.Approved
                };
            });
        }

        // ===== NEW: Calculate payroll for specific employees (main new workflow) =====
        public async Task CalculatePayrollForEmployeesAsync(int periodId, List<int> employeeIds, int userId)
        {
            var period = await _context.PayrollPeriods
                .Include(p => p.SchedulePeriod)
                .FirstOrDefaultAsync(p => p.Id == periodId);

            if (period == null) throw new KeyNotFoundException("Kỳ lương không tìm thấy.");
            if (period.Status == PayrollStatus.Locked)
                throw new InvalidOperationException("Bảng lương đã bị khóa, không thể tính lại.");

            var schedulePeriod = period.SchedulePeriod
                ?? await _context.SchedulePeriods.FindAsync(period.SchedulePeriodId)
                ?? throw new InvalidOperationException("Không tìm thấy kỳ chấm công liên kết.");

            var settings = await _context.PayrollSettings
                .Where(s => s.IsActive)
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync() ?? new PayrollSetting();

            int standardDays = GetStandardDays(schedulePeriod.StartDate, schedulePeriod.EndDate);

            // Remove existing records for these employees in this period (recalculate cleanly)
            var oldRecords = await _context.PayrollRecords
                .Where(r => r.PayrollPeriodId == periodId && employeeIds.Contains(r.EmployeeId))
                .ToListAsync();
            _context.PayrollRecords.RemoveRange(oldRecords);

            var employees = await _context.Employees
                .Include(e => e.Position)
                .Where(e => employeeIds.Contains(e.Id) && !e.Position.PositionName.Contains("Trưởng"))
                .ToListAsync();

            foreach (var emp in employees)
            {
                // Get approved attendance summary
                var asum = await _context.AttendanceSummaries
                    .FirstOrDefaultAsync(s => s.PeriodId == schedulePeriod.Id && s.EmployeeId == emp.Id
                        && s.Status == TimesheetStatus.Approved);

                decimal basicSalary = emp.BasicSalary;
                decimal adjustedWorkingDays = 0;
                decimal otHours = 0;

                if (asum != null)
                {
                    adjustedWorkingDays = asum.AdjustedWorkingDays > 0 ? asum.AdjustedWorkingDays : asum.TotalWorkingDays;
                    otHours = asum.OvertimeHours;
                }

                // A. Lương thời gian (Ltg) = Lcb / Nchuẩn × Ntt
                decimal ltg = standardDays > 0
                    ? (basicSalary / standardDays) * Math.Min(adjustedWorkingDays, standardDays)
                    : 0;

                // B. Lương tăng ca (Lot) = (Lcb / Nchuẩn / 8) × Hot × OTgiờ  [Hot = 1.5]
                decimal hourlyRate = standardDays > 0 ? basicSalary / standardDays / 8 : 0;
                decimal lot = hourlyRate * 1.5m * otHours;

                // C. Bảo hiểm (BH) = Lbh × 10.5%  (BHXH 8% + BHYT 1.5% + BHTN 1%)
                decimal insuranceBase = emp.InsuranceSalary ?? basicSalary;
                decimal bh = insuranceBase * 0.105m; // 10.5% total employee contribution

                // D. Thực lĩnh Net = (Ltg + Lot) - BH
                decimal net = ltg + lot - bh;

                var record = new PayrollRecord
                {
                    PayrollPeriodId = periodId,
                    EmployeeId = emp.Id,
                    BasicSalary = basicSalary,
                    ActualWorkingSalary = ltg,
                    OvertimePay = lot,
                    SocialInsurance = insuranceBase * (settings.SocialInsuranceRate / 100),
                    HealthInsurance = insuranceBase * (settings.HealthInsuranceRate / 100),
                    UnemploymentInsurance = insuranceBase * (settings.UnemploymentInsuranceRate / 100),
                    PersonalIncomeTax = 0, // No income tax per requirements
                    PositionAllowance = 0,
                    PetrolAllowance = 0,
                    PhoneAllowance = 0,
                    OtherAllowance = 0,
                    SalesSalary = 0,
                    Bonus = 0,
                    OtherDeductions = 0,
                    NetSalary = net,
                    CreatedAt = DateTime.UtcNow
                };
                _context.PayrollRecords.Add(record);
            }

            // Mark the period as processed
            var processorEmp = await _context.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            period.ProcessedById = processorEmp?.Id;
            period.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }
    }
}
