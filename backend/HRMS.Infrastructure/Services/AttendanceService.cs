using AutoMapper;
using HRMS.Application.DTOs.Attendance;
using HRMS.Application.Interfaces;
using HRMS.Domain.Entities;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using HRMS.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ClosedXML.Excel;
using System.IO;

namespace HRMS.Infrastructure.Services
{
    public class AttendanceService : IAttendanceService
    {
        private readonly HRMSDbContext _context;
        private readonly IMapper _mapper;
        private readonly INotificationService _notificationService;

        public AttendanceService(HRMSDbContext context, IMapper mapper, INotificationService notificationService)
        {
            _context = context;
            _mapper = mapper;
            _notificationService = notificationService;
        }

        public async Task<AttendanceRecordDto> CheckInAsync(CheckInDto dto)
        {
            var timestamp = dto.Timestamp ?? DateTime.Now;
            var employeeId = dto.EmployeeId ?? 0;
            
            Console.WriteLine($"[ATTENDANCE] Check-in attempt: EmpId={employeeId}, Time={timestamp}");

            if (employeeId <= 0)
            {
                Console.WriteLine("[ATTENDANCE] Error: Invalid EmployeeId 0");
                throw new InvalidOperationException("ID nhân viên không hợp lệ (0). Vui lòng đăng xuất và đăng nhập lại.");
            }

            var today = timestamp.Date;

            // 1. Kiểm tra hợp đồng hợp lệ (ACTIVE)
            var activeContract = await _context.EmployeeContracts
                .FirstOrDefaultAsync(c => c.EmployeeId == employeeId 
                    && c.Status == HRMS.Domain.Enums.ContractStatus.Active
                    && c.StartDate.Date <= today
                    && (!c.EndDate.HasValue || c.EndDate.Value.Date >= today));

            if (activeContract == null)
            {
                Console.WriteLine($"[ATTENDANCE] Error: No active contract found for Employee {employeeId} on {today:yyyy-MM-dd}");
                throw new InvalidOperationException("Bạn không thể chấm công do không có hợp đồng lao động đang có hiệu lực.");
            }
            
            // 2. Kiểm tra xem nhân viên đã check-in hôm nay chưa
            var existingCheckIn = await _context.TimeAttendanceRecords
                .FirstOrDefaultAsync(r => r.EmployeeId == employeeId 
                    && r.Date == today 
                    && r.Type == "CheckIn");
            
            if (existingCheckIn != null)
            {
                Console.WriteLine($"[ATTENDANCE] Error: Employee {employeeId} already checked in today ({today:yyyy-MM-dd})");
                throw new InvalidOperationException("Bạn đã check-in hôm nay rồi!");
            }

            // 2.5 Kiểm tra xem có đang trong ngày nghỉ phép không
            var isOnLeave = await _context.LeaveRequests
                .AnyAsync(lr => lr.EmployeeId == employeeId && 
                                lr.Status == HRMS.Domain.Enums.LeaveStatus.Approved &&
                                today >= lr.FromDate.Date && today <= lr.ToDate.Date);
            
            if (isOnLeave)
            {
                Console.WriteLine($"[ATTENDANCE] Error: Employee {employeeId} is on approved leave today ({today:yyyy-MM-dd})");
                throw new InvalidOperationException("Bạn đang trong ngày nghỉ phép đã được duyệt, không cần chấm công.");
            }

            // 3. Kiểm tra lịch làm việc (Ưu tiên lịch cụ thể, fallback về ca trong hợp đồng)
            var workSchedule = await _context.WorkSchedules
                .Include(ws => ws.WorkShift)
                .FirstOrDefaultAsync(ws => ws.EmployeeId == employeeId 
                    && ws.WorkingDate.Date == today);

            var employee = await _context.Employees
                .Include(e => e.Shift)
                .FirstOrDefaultAsync(e => e.Id == employeeId);
            
            if (employee == null) throw new InvalidOperationException("Không tìm thấy nhân viên.");

            if (workSchedule == null)
            {
                // Nếu không có lịch cụ thể, kiểm tra xem có ca mặc định từ hợp đồng (đã đồng bộ vào Profile) không
                if (!employee.ShiftId.HasValue)
                {
                    Console.WriteLine($"[ATTENDANCE] Error: No schedule and no default shift for Employee {employeeId}");
                    throw new InvalidOperationException($"Bạn không có lịch làm việc hôm nay và chưa được gán ca mặc định trong hợp đồng!");
                }
                Console.WriteLine($"[ATTENDANCE] No specific schedule. Using default contract shift ID: {employee.ShiftId}");
            }

            // Tạo record mới
            var record = new TimeAttendanceRecord
            {
                EmployeeId = employeeId,
                Timestamp = timestamp,
                Type = "CheckIn",
                Location = dto.Location ?? "",
                DeviceInfo = dto.DeviceInfo ?? "",
                Date = today,
                WorkScheduleId = workSchedule?.Id,
                CreatedAt = DateTime.UtcNow
            };

            _context.TimeAttendanceRecords.Add(record);
            await _context.SaveChangesAsync();

            // Map sang DTO để trả về
            var shiftInfo = workSchedule?.WorkShift ?? employee.Shift;

            return new AttendanceRecordDto
            {
                Id = record.Id,
                EmployeeId = record.EmployeeId,
                EmployeeName = employee?.FullName ?? "",
                Timestamp = record.Timestamp,
                Type = record.Type,
                Location = record.Location,
                Date = record.Date,
                ShiftName = shiftInfo?.ShiftName ?? "",
                ShiftStartTime = shiftInfo?.StartTime,
                ShiftEndTime = shiftInfo?.EndTime
            };
        }

        public async Task<AttendanceRecordDto> CheckOutAsync(CheckOutDto dto)
        {
            var timestamp = dto.Timestamp ?? DateTime.Now;
            var employeeId = dto.EmployeeId ?? throw new ArgumentNullException(nameof(dto.EmployeeId));
            var today = timestamp.Date;

            // Kiểm tra hợp đồng hợp lệ (ACTIVE) - Tương tự check in
            var activeContract = await _context.EmployeeContracts
                .FirstOrDefaultAsync(c => c.EmployeeId == employeeId 
                    && c.Status == HRMS.Domain.Enums.ContractStatus.Active
                    && c.StartDate.Date <= today
                    && (!c.EndDate.HasValue || c.EndDate.Value.Date >= today));

            if (activeContract == null)
            {
                throw new InvalidOperationException("Bạn không thể chấm công do không có hợp đồng lao động đang có hiệu lực.");
            }

            // Kiểm tra xem có đang trong ngày nghỉ phép không
            var isOnLeave = await _context.LeaveRequests
                .AnyAsync(lr => lr.EmployeeId == employeeId && 
                                lr.Status == HRMS.Domain.Enums.LeaveStatus.Approved &&
                                today >= lr.FromDate.Date && today <= lr.ToDate.Date);
            
            if (isOnLeave)
            {
                throw new InvalidOperationException("Bạn đang trong ngày nghỉ phép đã được duyệt, không cần chấm công.");
            }

            // Kiểm tra xem đã check-in chưa
            var checkInRecord = await _context.TimeAttendanceRecords
                .Include(r => r.WorkSchedule)
                    .ThenInclude(ws => ws.WorkShift)
                .Include(r => r.Employee)
                    .ThenInclude(e => e.Shift)
                .FirstOrDefaultAsync(r => r.EmployeeId == employeeId 
                    && r.Date == today 
                    && r.Type == "CheckIn");

            if (checkInRecord == null)
            {
                throw new InvalidOperationException("Bạn chưa check-in hôm nay!");
            }

            // Kiểm tra đã check-out chưa
            var existingCheckOut = await _context.TimeAttendanceRecords
                .FirstOrDefaultAsync(r => r.EmployeeId == employeeId 
                    && r.Date == today 
                    && r.Type == "CheckOut");

            if (existingCheckOut != null)
            {
                throw new InvalidOperationException("Bạn đã check-out hôm nay rồi!");
            }

            // Kiểm tra khoảng thời gian tối thiểu giữa check-in và check-out (15 phút)
            var timeDifference = timestamp - checkInRecord.Timestamp;
            const int minimumMinutes = 15;
            
            if (timeDifference.TotalMinutes < minimumMinutes)
            {
                var remainingMinutes = Math.Ceiling(minimumMinutes - timeDifference.TotalMinutes);
                throw new InvalidOperationException(
                    $"Bạn cần làm việc ít nhất {minimumMinutes} phút trước khi check-out. " +
                    $"Vui lòng chờ thêm {remainingMinutes} phút nữa. " +
                    $"(Check-in lúc: {checkInRecord.Timestamp:HH:mm})"
                );
            }

            // Tạo record check-out
            var record = new TimeAttendanceRecord
            {
                EmployeeId = employeeId,
                Timestamp = timestamp,
                Type = "CheckOut",
                Location = dto.Location ?? "",
                DeviceInfo = dto.DeviceInfo ?? "",
                Date = today,
                WorkScheduleId = checkInRecord.WorkScheduleId,
                CreatedAt = DateTime.UtcNow
            };

            _context.TimeAttendanceRecords.Add(record);
            await _context.SaveChangesAsync();

            // AUTOMATION: Compute and push final OT/Working hours to AttendanceDetail (Bảng công)
            try
            {
                await ComputeAndSaveAttendanceDetailAsync(employeeId, today);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ATTENDANCE] Automation Error: Failed to update AttendanceDetail: {ex.Message}");
            }


            var employee = checkInRecord.Employee;
            var shiftInfo = checkInRecord.WorkSchedule?.WorkShift ?? employee?.Shift;

            return new AttendanceRecordDto
            {
                Id = record.Id,
                EmployeeId = record.EmployeeId,
                EmployeeName = employee?.FullName ?? "",
                Timestamp = record.Timestamp,
                Type = record.Type,
                Location = record.Location,
                Date = record.Date,
                ShiftName = shiftInfo?.ShiftName ?? "",
                ShiftStartTime = shiftInfo?.StartTime,
                ShiftEndTime = shiftInfo?.EndTime
            };
        }

        public async Task<List<AttendanceRecordDto>> GetMyAttendanceRecordsAsync(int employeeId, DateTime? fromDate = null, DateTime? toDate = null)
        {
            var query = _context.TimeAttendanceRecords
                .Include(r => r.Employee)
                .Include(r => r.WorkSchedule)
                    .ThenInclude(ws => ws.WorkShift)
                .Where(r => r.EmployeeId == employeeId);

            if (fromDate.HasValue)
                query = query.Where(r => r.Date >= fromDate.Value.Date);

            if (toDate.HasValue)
                query = query.Where(r => r.Date <= toDate.Value.Date);

            var records = await query
                .OrderByDescending(r => r.Timestamp)
                .ToListAsync();

            // Fetch approved OT requests for this range to populate DTOs
            var f = fromDate?.Date ?? DateTime.MinValue;
            var t = toDate?.Date ?? DateTime.MaxValue;
            var otRequests = await _context.OvertimeRequests
                .Where(or => or.EmployeeId == employeeId && or.Date >= f && or.Date <= t && or.Status == "Approved")
                .ToListAsync();

            var result = records.Select(r => {
                var ot = otRequests.FirstOrDefault(o => o.Date.Date == r.Date.Date);
                return new AttendanceRecordDto
                {
                    Id = r.Id,
                    EmployeeId = r.EmployeeId,
                    EmployeeName = r.Employee?.FullName ?? "",
                    Timestamp = r.Timestamp,
                    Type = r.Type,
                    Location = r.Location,
                    Date = r.Date,
                    ShiftName = r.WorkSchedule?.WorkShift?.ShiftName ?? "",
                    ShiftStartTime = r.WorkSchedule?.WorkShift?.StartTime,
                    ShiftEndTime = r.WorkSchedule?.WorkShift?.EndTime,
                    OTStartTime = ot?.StartTime,
                    OTEndTime = ot?.EndTime
                };
            }).ToList();

            // FIX: If today is within range and no records exist for today, 
            // try to fetch the scheduled shift to help the frontend display the shift name before check-in.
            var today = DateTime.Today;
            if (today >= f && today <= t && !result.Any(r => r.Date.Date == today))
            {
                var schedule = await _context.WorkSchedules
                    .Include(ws => ws.WorkShift)
                    .Include(ws => ws.Employee)
                    .FirstOrDefaultAsync(ws => ws.EmployeeId == employeeId && ws.WorkingDate == today);

                if (schedule != null)
                {
                    var ot = otRequests.FirstOrDefault(o => o.Date.Date == today);
                    result.Add(new AttendanceRecordDto
                    {
                        Id = 0, // Virtual record
                        EmployeeId = employeeId,
                        EmployeeName = schedule.Employee?.FullName ?? "",
                        Date = today,
                        Type = "None", // Special type to indicate no check-in/out yet
                        ShiftName = schedule.WorkShift?.ShiftName ?? "",
                        ShiftStartTime = schedule.WorkShift?.StartTime,
                        ShiftEndTime = schedule.WorkShift?.EndTime,
                        OTStartTime = ot?.StartTime,
                        OTEndTime = ot?.EndTime
                    });
                }
            }

            return result.OrderByDescending(r => r.Date).ThenByDescending(r => r.Timestamp).ToList();
        }

        public async Task<AttendanceSummaryDto> GetMyAttendanceSummaryAsync(int employeeId, int periodId)
        {
            var summary = await _context.AttendanceSummaries
                .Include(s => s.Employee)
                .Include(s => s.Period)
                .FirstOrDefaultAsync(s => s.EmployeeId == employeeId && s.PeriodId == periodId);

            if (summary == null)
            {
                // Nếu chưa có summary, trả về object rỗng
                var period = await _context.SchedulePeriods.FindAsync(periodId);
                var employee = await _context.Employees.FindAsync(employeeId);
                
                return new AttendanceSummaryDto
                {
                    EmployeeId = employeeId,
                    EmployeeName = employee?.FullName ?? "",
                    PeriodId = periodId,
                    PeriodName = period?.PeriodName ?? "",
                    TotalWorkingDays = 0,
                    LateDays = 0,
                    EarlyLeaveDays = 0,
                    AbsentDays = 0,
                    TotalWorkingHours = 0,
                    OvertimeHours = 0
                };
            }

            return new AttendanceSummaryDto
            {
                Id = summary.Id,
                EmployeeId = summary.EmployeeId,
                EmployeeName = summary.Employee?.FullName ?? "",
                PeriodId = summary.PeriodId,
                PeriodName = summary.Period?.PeriodName ?? "",
                TotalWorkingDays = summary.TotalWorkingDays,
                AdjustedWorkingDays = summary.AdjustedWorkingDays,
                LateDays = summary.LateDays,
                EarlyLeaveDays = summary.EarlyLeaveDays,
                AbsentDays = summary.AbsentDays,
                TotalWorkingHours = summary.TotalWorkingHours,
                OvertimeHours = summary.OvertimeHours
            };
        }

        public async Task<TimeAdjustmentRequestDto> CreateAdjustmentRequestAsync(int employeeId, CreateTimeAdjustmentRequestDto dto)
        {
            var request = new TimeAdjustmentRequest
            {
                EmployeeId = employeeId,
                RequestedDate = dto.RequestedDate,
                Type = dto.Type,
                Reason = dto.Reason,
                CorrectedCheckIn = dto.CorrectedCheckIn,
                CorrectedCheckOut = dto.CorrectedCheckOut,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            _context.TimeAdjustmentRequests.Add(request);
            await _context.SaveChangesAsync();

            var employee = await _context.Employees.FindAsync(employeeId);

            return new TimeAdjustmentRequestDto
            {
                Id = request.Id,
                EmployeeId = request.EmployeeId,
                RequestedDate = request.RequestedDate,
                Type = request.Type,
                Reason = request.Reason,
                CorrectedCheckIn = request.CorrectedCheckIn,
                CorrectedCheckOut = request.CorrectedCheckOut,
                Status = request.Status,
                CreatedAt = request.CreatedAt
            };
        }

        public async Task<List<TimeAdjustmentRequestDto>> GetMyAdjustmentRequestsAsync(int employeeId)
        {
            var requests = await _context.TimeAdjustmentRequests
                .Where(r => r.EmployeeId == employeeId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return requests.Select(r => new TimeAdjustmentRequestDto
            {
                Id = r.Id,
                EmployeeId = r.EmployeeId,
                RequestedDate = r.RequestedDate,
                Type = r.Type,
                Reason = r.Reason,
                OriginalCheckIn = r.OriginalCheckIn,
                OriginalCheckOut = r.OriginalCheckOut,
                CorrectedCheckIn = r.CorrectedCheckIn,
                CorrectedCheckOut = r.CorrectedCheckOut,
                Status = r.Status,
                ApprovedBy = r.ApprovedBy,
                ApprovedAt = r.ApprovedAt,
                ApprovalNote = r.ApprovalNote,
                CreatedAt = r.CreatedAt
            }).ToList();
        }

        // Admin/Manager functions
        public async Task<List<AttendanceRecordDto>> GetAttendanceRecordsByDepartmentAsync(int departmentId, DateTime date)
        {
            var targetDate = date.Date; // Normalize: strip time component
            Console.WriteLine($"[ADMIN ATTENDANCE] Querying date={targetDate:yyyy-MM-dd}, deptId={departmentId}");

            var records = await _context.TimeAttendanceRecords
                .Include(r => r.Employee)
                    .ThenInclude(e => e.Department)
                .Include(r => r.WorkSchedule)
                    .ThenInclude(ws => ws.WorkShift)
                .Where(r => (departmentId == 0 || r.Employee.DepartmentId == departmentId) && r.Date == targetDate)
                .OrderBy(r => r.Employee.FullName)
                .ThenBy(r => r.Timestamp)
                .ToListAsync();
            
            Console.WriteLine($"[ADMIN ATTENDANCE] Found {records.Count} records for date={targetDate:yyyy-MM-dd}");

            return records.Select(r => new AttendanceRecordDto
            {
                Id = r.Id,
                EmployeeId = r.EmployeeId,
                EmployeeName = r.Employee?.FullName ?? "",
                Timestamp = r.Timestamp,
                Type = r.Type,
                Location = r.Location,
                Date = r.Date,
                ShiftName = r.WorkSchedule?.WorkShift?.ShiftName ?? "",
                ShiftStartTime = r.WorkSchedule?.WorkShift?.StartTime,
                ShiftEndTime = r.WorkSchedule?.WorkShift?.EndTime
            }).ToList();
        }

        public async Task<bool> ApproveAdjustmentRequestAsync(int requestId, int approverId, string note)
        {
            var request = await _context.TimeAdjustmentRequests.FindAsync(requestId);
            if (request == null || request.Status != "Pending")
                return false;

            request.Status = "Approved";
            request.ApprovedBy = approverId;
            request.ApprovedAt = DateTime.UtcNow;
            request.ApprovalNote = note ?? "";

            await _context.SaveChangesAsync();

            // Create notification for employee
            await _notificationService.CreateNotificationAsync(new HRMS.Application.DTOs.Notification.CreateNotificationDto
            {
                EmployeeId = request.EmployeeId,
                Title = "Yêu cầu điều chỉnh công được DUYỆT",
                Message = $"Yêu cầu điều chỉnh công ngày {request.RequestedDate:dd/MM/yyyy} của bạn đã được duyệt.",
                Type = "Adjustment",
                RelatedId = request.Id.ToString()
            });

            return true;
        }

        public async Task<bool> RejectAdjustmentRequestAsync(int requestId, int approverId, string note)
        {
            var request = await _context.TimeAdjustmentRequests.FindAsync(requestId);
            if (request == null || request.Status != "Pending")
                return false;

            request.Status = "Rejected";
            request.ApprovedBy = approverId;
            request.ApprovedAt = DateTime.UtcNow;
            request.ApprovalNote = note ?? "";

            await _context.SaveChangesAsync();

            // Create notification for employee
            await _notificationService.CreateNotificationAsync(new HRMS.Application.DTOs.Notification.CreateNotificationDto
            {
                EmployeeId = request.EmployeeId,
                Title = "Yêu cầu điều chỉnh công bị TỪ CHỐI",
                Message = $"Yêu cầu điều chỉnh công ngày {request.RequestedDate:dd/MM/yyyy} của bạn đã bị từ chối. Lý do: {note}",
                Type = "Adjustment",
                RelatedId = request.Id.ToString()
            });

            return true;
        }

        public async Task<List<AttendanceSummaryDto>> GetDepartmentTimesheetsAsync(int departmentId, int periodId)
        {
            var query = _context.AttendanceSummaries
                .Include(s => s.Employee)
                    .ThenInclude(e => e.User)
                        .ThenInclude(u => u.UserRoles)
                            .ThenInclude(ur => ur.Role)
                .Include(s => s.Period)
                .Include(s => s.ApprovedBy)
                .Where(s => s.PeriodId == periodId);

            if (departmentId > 0)
            {
                var targetIds = await GetDepartmentHierarchyIdsAsync(departmentId);
                query = query.Where(s => targetIds.Contains(s.Employee.DepartmentId));
            }

            var summaries = await query.ToListAsync();

            return summaries.Select(s => new AttendanceSummaryDto
            {
                Id = s.Id,
                EmployeeId = s.EmployeeId,
                EmployeeName = s.Employee?.FullName ?? "",
                IsAdmin = s.Employee?.User?.UserRoles?.Any(ur => ur.Role?.RoleName == "Admin" || ur.Role?.RoleName == "HrAdmin") ?? false,
                PeriodId = s.PeriodId,
                PeriodName = s.Period?.PeriodName ?? "",
                TotalWorkingDays = s.TotalWorkingDays,
                AdjustedWorkingDays = s.AdjustedWorkingDays,
                LateDays = s.LateDays,
                EarlyLeaveDays = s.EarlyLeaveDays,
                AbsentDays = s.AbsentDays,
                TotalWorkingHours = s.TotalWorkingHours,
                OvertimeHours = s.OvertimeHours,
                Status = s.Status.ToString(),
                ApprovedById = s.ApprovedById,
                ApproverName = s.ApprovedBy?.FullName,
                ApprovedAt = s.ApprovedAt
            }).ToList();
        }

        public async Task<HRMS.Application.DTOs.Attendance.AttendanceReportSummaryDto> GetAttendanceSummaryReportAsync(string month, int? departmentId, int page, int limit)
        {
            var parts = month.Split('-');
            if (parts.Length != 2 || !int.TryParse(parts[0], out int year) || !int.TryParse(parts[1], out int m))
                throw new ArgumentException("Định dạng tháng không hợp lệ (YYYY-MM)");

            var query = _context.AttendanceSummaries
                .Include(s => s.Employee)
                .ThenInclude(e => e.Department)
                .Include(s => s.Period)
                .Where(s => s.Period.StartDate.Year == year && s.Period.StartDate.Month == m);

            if (departmentId.HasValue && departmentId.Value > 0)
            {
                var targetIds = await GetDepartmentHierarchyIdsAsync(departmentId.Value);
                query = query.Where(s => targetIds.Contains(s.Employee.DepartmentId));
            }

            var totalItems = await query.CountAsync();
            var summaries = await query
                .OrderBy(s => s.Employee.Department.DepartmentName)
                .ThenBy(s => s.Employee.FullName)
                .Skip((page - 1) * limit)
                .Take(limit)
                .ToListAsync();

            var items = summaries.Select(s => {
                decimal expectedDays = s.TotalWorkingDays > 0 ? s.TotalWorkingDays : 1;
                decimal lateEarlyTotal = s.LateDays + s.EarlyLeaveDays;
                decimal onTimePerc = 100m * (1m - (lateEarlyTotal / expectedDays));
                if (onTimePerc < 0) onTimePerc = 0;
                if (onTimePerc > 100) onTimePerc = 100;

                return new HRMS.Application.DTOs.Attendance.AttendanceReportItemDto
                {
                    EmployeeId = s.EmployeeId,
                    EmployeeName = s.Employee?.FullName ?? "",
                    EmployeeCode = s.Employee?.EmployeeCode ?? "",
                    DepartmentId = s.Employee?.DepartmentId ?? 0,
                    DepartmentName = s.Employee?.Department?.DepartmentName ?? "",
                    TotalWorkingDays = s.TotalWorkingDays,
                    ActualWorkingDays = s.AdjustedWorkingDays > 0 ? s.AdjustedWorkingDays : Math.Max(0, s.TotalWorkingDays - s.AbsentDays),
                    TotalOvertimeHours = s.OvertimeHours,
                    TotalLeaveDays = s.AbsentDays,
                    LateOrEarlyCount = s.LateDays + s.EarlyLeaveDays,
                    OnTimePercentage = Math.Round(onTimePerc, 1)
                };
            }).ToList();

            return new HRMS.Application.DTOs.Attendance.AttendanceReportSummaryDto
            {
                Items = items,
                TotalItems = totalItems,
                CurrentPage = page,
                TotalPages = (int)Math.Ceiling(totalItems / (double)limit)
            };
        }

        public async Task<AttendanceGridDto> GetDepartmentAttendanceGridAsync(int departmentId, int periodId)
        {
            var period = await _context.SchedulePeriods.FindAsync(periodId);
            if (period == null) return new AttendanceGridDto();

            var result = new AttendanceGridDto();
            
            // 1. Tạo headers cho các ngày trong kỳ
            for (var date = period.StartDate.Date; date <= period.EndDate.Date; date = date.AddDays(1))
            {
                result.DateHeaders.Add(date.ToString("dd/MM"));
            }

            // 2. Lấy danh sách nhân viên & Summary trong bộ phận
            var query = _context.AttendanceSummaries
                .Include(s => s.Employee)
                    .ThenInclude(e => e.User)
                        .ThenInclude(u => u.UserRoles)
                            .ThenInclude(ur => ur.Role)
                .Where(s => s.PeriodId == periodId);

            if (departmentId > 0)
            {
                var targetIds = await GetDepartmentHierarchyIdsAsync(departmentId);
                query = query.Where(s => targetIds.Contains(s.Employee.DepartmentId));
            }

            var summaries = await query.ToListAsync();

            // 3. Lấy tất cả Detail trong kỳ này của bộ phận này (để tránh n+1 query)
            var empIds = summaries.Select(s => s.EmployeeId).ToList();
            var allDetails = await _context.AttendanceDetails
                .Where(d => empIds.Contains(d.EmployeeId) && d.Date >= period.StartDate && d.Date <= period.EndDate)
                .ToListAsync();

            // 4. Build từng dòng dữ liệu
            foreach (var s in summaries)
            {
                var row = new AttendanceGridRowDto
                {
                    SummaryId = s.Id,
                    EmployeeId = s.EmployeeId,
                    EmployeeName = s.Employee?.FullName ?? "N/A",
                    TotalOT = s.OvertimeHours,
                    Status = s.Status.ToString(),
                    IsAdmin = s.Employee?.User?.UserRoles?.Any(ur => ur.Role?.RoleName == "Admin" || ur.Role?.RoleName == "HrAdmin") ?? false
                };

                var empDetails = allDetails.Where(d => d.EmployeeId == s.EmployeeId).ToDictionary(d => d.Date.Date);

                for (var date = period.StartDate.Date; date <= period.EndDate.Date; date = date.AddDays(1))
                {
                    if (empDetails.TryGetValue(date, out var d))
                    {
                        row.DailyValues.Add(d.WorkingDays);
                    }
                    else
                    {
                        row.DailyValues.Add(0);
                    }
                }

                result.Rows.Add(row);
            }

            return result;
        }

        public async Task<bool> ApproveTimesheetAsync(int summaryId, int approverId, bool isHead = false, bool isManager = false, bool isAdmin = false)
        {
            var summary = await _context.AttendanceSummaries
                .Include(s => s.Employee)
                    .ThenInclude(e => e.User)
                        .ThenInclude(u => u.UserRoles)
                            .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(s => s.Id == summaryId);

            if (summary == null) return false;

            // Ràng buộc bảo mật: Không được tự duyệt công cho chính mình
            if (approverId == summary.EmployeeId) return false;

            // Ràng buộc bảo mật: Trưởng phòng/Trưởng bộ phận không được chốt công cho Admin
            // (Chỉ Admin tối cao mới được chốt cho Admin khác)
            bool targetIsAdmin = summary.Employee?.User?.UserRoles?.Any(ur => ur.Role?.RoleName == "Admin" || ur.Role?.RoleName == "HrAdmin") ?? false;
            if (targetIsAdmin && !isAdmin) return false;

            // Workflow: Manager/Admin finalizes the record directly from Draft or Pending
            if ((isManager || isAdmin) && (summary.Status == TimesheetStatus.Draft || summary.Status == TimesheetStatus.PendingManagerApproval || summary.Status == TimesheetStatus.PendingHeadApproval))
            {
                // Manager/Admin finalizes the record
                summary.Status = TimesheetStatus.Approved;
            }
            else
            {
                // Invalid transition or unauthorized role (e.g. Head trying to approve)
                return false;
            }

            summary.ApprovedById = approverId;
            summary.ApprovedAt = DateTime.UtcNow;
            summary.UpdatedAt = DateTime.UtcNow;

            try
            {
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                var innerMsg = ex.InnerException?.Message ?? ex.Message;
                Console.WriteLine($"❌ [SubmitOvertimeRequest] SAVE ERROR: {ex.Message}");
                Console.WriteLine($"❌ [SubmitOvertimeRequest] INNER ERROR: {innerMsg}");
                throw new Exception($"Lỗi hệ thống: {innerMsg}");
            }
        }

        public async Task<int> ApproveAllTimesheetsAsync(int departmentId, int periodId, int approverId, bool isHead = false, bool isManager = false, bool isAdmin = false)
        {
            var query = _context.AttendanceSummaries
                .Include(s => s.Employee)
                    .ThenInclude(e => e.User)
                        .ThenInclude(u => u.UserRoles)
                            .ThenInclude(ur => ur.Role)
                .Where(s => s.PeriodId == periodId);

            // Không bao giờ cho phép chốt cho chính mình trong danh sách duyệt hàng loạt
            query = query.Where(s => s.EmployeeId != approverId);

            if (isHead)
            {
                query = query.Where(s => s.Status == TimesheetStatus.Draft || s.Status == TimesheetStatus.PendingHeadApproval);
            }
            else if (isManager || isAdmin)
            {
                // Manager/Admin can approve anything that is not yet Approved or Rejected
                query = query.Where(s => s.Status != TimesheetStatus.Approved && s.Status != TimesheetStatus.Rejected);
                
                // If is Manager (not top Admin), we might still exclude Admin records if that's the rule
                if (isManager && !isAdmin)
                {
                    query = query.Where(s => !s.Employee.User.UserRoles.Any(ur => ur.Role.RoleName == "Admin" || ur.Role.RoleName == "HrAdmin"));
                }
            }
            else
                return 0;

            if (departmentId > 0)
            {
                var targetIds = await GetDepartmentHierarchyIdsAsync(departmentId);
                query = query.Where(s => targetIds.Contains(s.Employee.DepartmentId));
            }

            var summaries = await query.ToListAsync();
            foreach (var summary in summaries)
            {
                // Re-verify security for each record in the list (Double safety)
                if (summary.EmployeeId == approverId) continue;
                
                bool targetIsAdmin = summary.Employee?.User?.UserRoles?.Any(ur => ur.Role?.RoleName == "Admin" || ur.Role?.RoleName == "HrAdmin") ?? false;
                if (targetIsAdmin && !isAdmin) continue;

                if (isManager || isAdmin)
                    summary.Status = TimesheetStatus.Approved;
                else
                    continue; // Head is no longer authorized to bulk approve
                
                summary.ApprovedById = approverId;
                summary.ApprovedAt = DateTime.UtcNow;
                summary.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return summaries.Count;
        }

        public async Task<int> GenerateSummariesAsync(int periodId)
        {
            var period = await _context.SchedulePeriods.FindAsync(periodId);
            if (period == null) return 0;

            // Chỉ xoá các bản ghi Draft, giữ nguyên các bản ghi đã duyệt
            var existingSummaries = await _context.AttendanceSummaries
                .Where(s => s.PeriodId == periodId && s.Status == TimesheetStatus.Draft)
                .ToListAsync();
            _context.AttendanceSummaries.RemoveRange(existingSummaries);

            var employees = await _context.Employees.Include(e => e.Shift).ToListAsync();
            int count = 0;

            // Grace Period constants
            // Check-in: nếu bấm trong khoảng [ShiftStart - 30p, ShiftStart] → đúng giờ (ghi nhận ShiftStart)
            // Check-in: nếu bấm sau ShiftStart → đi trễ (ghi nhận giờ thực để tính trễ)
            // Check-out: nếu bấm trong khoảng [ShiftEnd, ShiftEnd + 15p] → đúng giờ (ghi nhận ShiftEnd)
            // Check-out: nếu bấm trước ShiftEnd → về sớm (ghi nhận giờ thực để tính sớm)
            const int CHECK_IN_GRACE_BEFORE_MINUTES = 30;   // 30 phút trước giờ vào
            const int CHECK_OUT_GRACE_AFTER_MINUTES = 15;   // 15 phút sau giờ ra

            // Tính số ngày làm việc kỳ vọng trong kỳ (Thứ 2 - Thứ 7)
            int expectedWorkDays = 0;
            for (var d = period.StartDate.Date; d <= period.EndDate.Date; d = d.AddDays(1))
            {
                if (d.DayOfWeek != DayOfWeek.Sunday) expectedWorkDays++;
            }

            foreach (var emp in employees)
            {
                // Skip if there's an approved summary
                bool hasApprovedSummary = await _context.AttendanceSummaries.AnyAsync(s => s.EmployeeId == emp.Id && s.PeriodId == periodId && s.Status != TimesheetStatus.Draft);
                if (hasApprovedSummary) continue;

                // Xoá chi tiết công cũ của nhân viên này trong kỳ để tính lại mới
                var oldDetails = await _context.AttendanceDetails
                    .Where(d => d.EmployeeId == emp.Id && d.Date >= period.StartDate && d.Date <= period.EndDate)
                    .ToListAsync();
                if (oldDetails.Any())
                {
                    _context.AttendanceDetails.RemoveRange(oldDetails);
                }

                var records = await _context.TimeAttendanceRecords
                    .Include(r => r.WorkSchedule)
                        .ThenInclude(ws => ws.WorkShift)
                    .Where(r => r.EmployeeId == emp.Id && r.Date >= period.StartDate && r.Date <= period.EndDate)
                    .ToListAsync();

                if (!records.Any()) continue;

                decimal totalWorkingHours = 0;
                decimal totalOtHours = 0;
                int lateDays = 0;
                int earlyLeaveDays = 0;
                int rawWorkingDays = 0;
                int dualViolationDays = 0;
                decimal workingDaysValueTotal = 0;

                var groupedRecords = records.GroupBy(r => r.Date);
                foreach (var dayGroup in groupedRecords)
                {
                    var checkInList = dayGroup.Where(r => r.Type == "CheckIn").ToList();
                    var checkOutList = dayGroup.Where(r => r.Type == "CheckOut").ToList();

                    var checkInCount = checkInList.Count;
                    var checkOutCount = checkOutList.Count;

                    var checkIn = checkInList.OrderBy(r => r.Timestamp).FirstOrDefault();
                    var checkOut = checkOutList.OrderByDescending(r => r.Timestamp).FirstOrDefault();

                    if (checkIn == null) continue; // Không có check-in → không tính ngày công
                    
                    rawWorkingDays++;

                    var shift = checkIn.WorkSchedule?.WorkShift ?? emp.Shift;

                    bool isLate = false;
                    bool isEarlyLeave = false;
                    
                    TimeSpan? snappedCheckInTime = checkIn.Timestamp.TimeOfDay;
                    TimeSpan? snappedCheckOutTime = checkOut?.Timestamp.TimeOfDay;

                    // Lấy số giờ OT nếu có (Chỉ tính nếu có record OvertimeAssignment)
                    decimal otHours = 0;
                    var todayAssignment = await _context.OvertimeAssignments
                        .Where(oa => oa.EmployeeId == emp.Id && 
                                     oa.Date.Date == dayGroup.Key.Date)
                        .FirstOrDefaultAsync();

                    if (shift != null)
                    {
                        var shiftStart = shift.StartTime;
                        var shiftEnd = shift.EndTime;

                        // Tạo mốc thời gian DateTime để so sánh chính xác (đặc biệt là ca xuyên đêm)
                        DateTime shiftStartDt = dayGroup.Key.Add(shiftStart);
                        DateTime shiftEndDt = dayGroup.Key.Add(shiftEnd);

                        if (shiftEnd <= shiftStart)
                        {
                            // Ca xuyên đêm (VD: 22h - 06h sáng hôm sau)
                            shiftEndDt = shiftEndDt.AddDays(1);
                        }

                        // Áp dụng Grace Period (30p trước / 15p sau)
                        DateTime checkInGraceStart = shiftStartDt.AddMinutes(-CHECK_IN_GRACE_BEFORE_MINUTES);
                        DateTime checkOutGraceEnd = shiftEndDt.AddMinutes(CHECK_OUT_GRACE_AFTER_MINUTES);

                        // ── KIỂM TRA CHECK-IN ────────────────────────────────
                        if (checkIn.Timestamp >= checkInGraceStart && checkIn.Timestamp <= shiftStartDt)
                        {
                            snappedCheckInTime = shiftStart; 
                        }
                        else if (checkIn.Timestamp > shiftStartDt)
                        {
                            isLate = true; 
                            snappedCheckInTime = checkIn.Timestamp.TimeOfDay;
                        }

                        // ── KIỂM TRA CHECK-OUT & TÍNH OT ─────────────────────────
                        if (checkOut != null)
                        {
                            // 1. Kiểm tra về sớm
                            if (checkOut.Timestamp < shiftEndDt)
                            {
                                isEarlyLeave = true;
                                snappedCheckOutTime = checkOut.Timestamp.TimeOfDay;
                            }
                            else 
                            {
                                // 2. Về đúng giờ hoặc muộn hơn (có thể có OT)
                                if (todayAssignment == null)
                                {
                                    // Về muộn nhưng không có kế hoạch OT -> SNAP VỀ shiftEnd (Cap tại 0 giờ OT)
                                    snappedCheckOutTime = shiftEnd;
                                }
                                else if (checkOut.Timestamp <= checkOutGraceEnd)
                                {
                                    // Trong grace period -> Snap về shiftEnd
                                    snappedCheckOutTime = shiftEnd;
                                }
                                else 
                                {
                                    // CÓ KẾ HOẠCH OT ĐƯỢC GIAO (todayAssignment != null)
                                    double actualOtMins = (checkOut.Timestamp - shiftEndDt).TotalMinutes;
                                    double assignedOtMins = (double)todayAssignment.AssignedMaxHours * 60.0;

                                    // LUẬT CỐT LÕI: Min (Thực tế, Được giao)
                                    double validOtMins = Math.Min(actualOtMins, assignedOtMins);
                                    if (validOtMins < 0) validOtMins = 0;

                                    // Làm tròn xuống theo block 0.5h (30p)
                                    otHours = (decimal)(Math.Floor(validOtMins / 30.0) * 0.5);
                                    totalOtHours += otHours;

                                    // Snapped Checkout = ShiftEnd + Số giờ OT thực tế đã làm tròn
                                    DateTime finalOutDt = shiftEndDt.AddHours((double)otHours);
                                    snappedCheckOutTime = finalOutDt.TimeOfDay;
                                }
                            }
                        }
                    }

                    if (isLate) lateDays++;
                    if (isEarlyLeave) earlyLeaveDays++;

                    decimal duration = 0;
                    decimal workingDaysValue = 0;

                    if (snappedCheckInTime != null && snappedCheckOutTime != null)
                    {
                        // Quy tắc phạt nghiêm ngặt:
                        // - Đúng giờ cả 2: 8h, 1.0 công
                        // - Vi phạm 1 lỗi: 4h, 0.5 công
                        // - Vi phạm 2 lỗi: 0h, 0.0 công
                        
                        if (!isLate && !isEarlyLeave)
                        {
                            duration = 8.0m;
                            workingDaysValue = 1.0m;
                        }
                        else if (isLate && isEarlyLeave)
                        {
                            duration = 0; 
                            workingDaysValue = 0; 
                            dualViolationDays++;
                        }
                        else
                        {
                            duration = 4.0m;
                            workingDaysValue = 0.5m;
                        }
                        
                        totalWorkingHours += duration;
                    }

                    string statusLabel = "Đúng giờ";
                    if (isLate && isEarlyLeave) statusLabel = "Trễ & Sớm";
                    else if (isLate) statusLabel = "Đi muộn";
                    else if (isEarlyLeave) statusLabel = "Về sớm";

                    var detail = new AttendanceDetail
                    {
                        EmployeeId = emp.Id,
                        Date = dayGroup.Key,
                        WorkShiftId = shift?.Id,
                        CheckInTime = snappedCheckInTime,
                        CheckOutTime = snappedCheckOutTime,
                        IsLate = isLate,
                        IsEarlyLeave = isEarlyLeave,
                        WorkingHours = duration,
                        WorkingDays = workingDaysValue,
                        OTHours = otHours,
                        Status = statusLabel,
                        CheckInCount = checkInCount,
                        CheckOutCount = checkOutCount,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.AttendanceDetails.Add(detail);
                    if (snappedCheckInTime != null && snappedCheckOutTime != null)
                    {
                        workingDaysValueTotal += workingDaysValue;
                    }
                }

                // ── TỔNG HỢP SAU KHI TÍNH PHẠT ──────────────────────────────────────
                // Với quy tắc mới: penalty được tính trực tiếp vào workingDaysValueTotal phía trên.

                var summary = new AttendanceSummary
                {
                    EmployeeId = emp.Id,
                    PeriodId = periodId,
                    Status = TimesheetStatus.Draft,
                    CreatedAt = DateTime.UtcNow,
                    TotalWorkingDays = rawWorkingDays,          
                    AdjustedWorkingDays = workingDaysValueTotal,  
                    LateDays = lateDays,
                    EarlyLeaveDays = earlyLeaveDays,
                    AbsentDays = Math.Max(0, expectedWorkDays - rawWorkingDays) + dualViolationDays,                             
                    TotalWorkingHours = totalWorkingHours,
                    OvertimeHours = totalOtHours
                };

                decimal penaltyDays = rawWorkingDays - workingDaysValueTotal;
                Console.WriteLine($"[SUMMARY] EmpId={emp.Id} RawDays={rawWorkingDays} Late={lateDays} Early={earlyLeaveDays} Penalty={penaltyDays} AdjustedDays={workingDaysValueTotal}");

                _context.AttendanceSummaries.Add(summary);
                count++;
            }

            await _context.SaveChangesAsync();
            return count;
        }

        // --- New Overtime Management Implementations ---

        public async Task<OvertimePlanDto> CreateOvertimePlanAsync(CreateOvertimePlanDto dto, int creatorUserId)
        {
            var creator = await _context.Employees.FirstOrDefaultAsync(e => e.UserId == creatorUserId);
            if (creator == null) throw new InvalidOperationException("Không tìm thấy thông tin nhân viên của người tạo.");

            var plan = new OvertimePlan
            {
                DepartmentId = dto.DepartmentId,
                Month = dto.Month,
                Year = dto.Year,
                TotalBudgetHours = dto.TotalBudgetHours,
                Description = dto.Description,
                Status = "Draft",
                CreatedById = creator.Id,
                CreatedAt = DateTime.UtcNow
            };

            _context.OvertimePlans.Add(plan);
            await _context.SaveChangesAsync();

            var dept = await _context.Departments.FindAsync(dto.DepartmentId);

            return new OvertimePlanDto
            {
                Id = plan.Id,
                DepartmentName = dept?.DepartmentName ?? "Unknown",
                Month = plan.Month,
                Year = plan.Year,
                TotalBudgetHours = plan.TotalBudgetHours,
                Description = plan.Description,
                Status = plan.Status,
                CreatedBy = creator.FullName,
                CreatedAt = plan.CreatedAt
            };
        }

        public async Task<List<OvertimePlanDto>> GetOvertimePlansAsync(int? departmentId, int? month, int? year)
        {
            var query = _context.OvertimePlans
                .Include(p => p.Department)
                .Include(p => p.CreatedBy)
                .AsQueryable();

            if (departmentId.HasValue && departmentId > 0)
            {
                var targetIds = await GetDepartmentHierarchyIdsAsync(departmentId.Value);
                query = query.Where(p => targetIds.Contains(p.DepartmentId));
            }

            if (month.HasValue)
                query = query.Where(p => p.Month == month);

            if (year.HasValue)
                query = query.Where(p => p.Year == year);

            var plans = await query.OrderByDescending(p => p.Year).ThenByDescending(p => p.Month).ToListAsync();

            return plans.Select(plan => new OvertimePlanDto
            {
                Id = plan.Id,
                DepartmentId = plan.DepartmentId,
                DepartmentName = plan.Department?.DepartmentName ?? "Unknown",
                Month = plan.Month,
                Year = plan.Year,
                TotalBudgetHours = plan.TotalBudgetHours,
                Description = plan.Description,
                Status = plan.Status,
                CreatedBy = plan.CreatedBy?.FullName ?? "System",
                CreatedAt = plan.CreatedAt
            }).ToList();
        }

        public async Task<bool> BulkAssignOvertimeAsync(BulkAssignOvertimeDto dto, int assignerUserId)
        {
            var assigner = await _context.Employees.FirstOrDefaultAsync(e => e.UserId == assignerUserId);
            if (assigner == null) throw new InvalidOperationException("Không tìm thấy thông tin nhân viên của người gán.");

            foreach (var item in dto.Assignments)
            {
                // Quy tắc 1: Phải thông báo trước từ 1 đến 3 ngày
                var daysDiff = (item.Date.Date - DateTime.Today.Date).TotalDays;
                if (daysDiff < 2)
                {
                    throw new InvalidOperationException($"Không thể đề cử cho ngày {item.Date:dd/MM/yyyy}. Lịch OT phải được tạo trước ít nhất 2 ngày.");
                }

                // Quy tắc 2: Phải có ca làm việc và không phải là ngày nghỉ
                var schedule = await _context.WorkSchedules
                    .FirstOrDefaultAsync(s => s.EmployeeId == item.EmployeeId && s.WorkingDate.Date == item.Date.Date);

                if (schedule == null)
                {
                    throw new InvalidOperationException($"Nhân viên ID {item.EmployeeId} chưa có lịch làm việc (WorkSchedule) vào ngày {item.Date:dd/MM/yyyy}.");
                }
                
                if (schedule.WorkShiftId == null)
                {
                    throw new InvalidOperationException($"Nhân viên ID {item.EmployeeId} có lịch nghỉ (OFF) vào ngày {item.Date:dd/MM/yyyy}, không thể áp dụng tăng ca.");
                }
                // Xoá assignment cũ nếu có cho ngày đó/nhân viên đó
                var existing = await _context.OvertimeAssignments
                    .FirstOrDefaultAsync(oa => oa.EmployeeId == item.EmployeeId && oa.Date.Date == item.Date.Date);

                if (item.Hours <= 0)
                {
                    if (existing != null) _context.OvertimeAssignments.Remove(existing);
                    continue;
                }

                if (existing != null)
                {
                    existing.AssignedMaxHours = item.Hours;
                    existing.AssignedById = assigner.Id;
                    existing.OvertimePlanId = dto.PlanId;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    var assignment = new OvertimeAssignment
                    {
                        EmployeeId = item.EmployeeId,
                        Date = item.Date.Date,
                        AssignedMaxHours = item.Hours,
                        AssignedById = assigner.Id,
                        OvertimePlanId = dto.PlanId,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.OvertimeAssignments.Add(assignment);
                }

                // Push Notification to Employee
                await _notificationService.CreateNotificationAsync(new HRMS.Application.DTOs.Notification.CreateNotificationDto
                {
                    EmployeeId = item.EmployeeId,
                    Title = "Thông báo: Lịch làm thêm (OT) mới",
                    Message = $"Bạn có lịch làm thêm vào ngày {item.Date:dd/MM/yyyy} với số giờ tối đa được duyệt là {item.Hours}h.",
                    Type = "Overtime",
                    RelatedId = item.Date.ToString("yyyyMMdd")
                });
            }

            await _context.SaveChangesAsync();
            return true;
        }


        public async Task<List<OvertimeAssignmentDto>> GetMyOvertimeAssignmentsAsync(int employeeId, DateTime fromDate, DateTime toDate)
        {
            var assignments = await _context.OvertimeAssignments
                .Include(a => a.AssignedBy)
                .Where(a => a.EmployeeId == employeeId && a.Date.Date >= fromDate.Date && a.Date.Date <= toDate.Date)
                .OrderBy(a => a.Date)
                .ToListAsync();

            return assignments.Select(a => new OvertimeAssignmentDto
            {
                Id = a.Id,
                EmployeeId = a.EmployeeId,
                Date = a.Date,
                AssignedMaxHours = a.AssignedMaxHours,
                AssignedBy = a.AssignedBy?.FullName ?? "Unknown",
                IsConfirmed = a.IsConfirmed
            }).ToList();
        }

        public async Task<AttendanceGridDto> GetOvertimeAssignmentGridAsync(int departmentId, int month, int year)
        {
            var startDate = new DateTime(year, month, 1);
            var endDate = startDate.AddMonths(1).AddDays(-1);

            var result = new AttendanceGridDto();

            // 1. Headers (Các ngày trong tháng)
            for (var d = startDate; d <= endDate; d = d.AddDays(1))
            {
                result.DateHeaders.Add(d.ToString("dd/MM"));
            }

            // 2. Lấy danh sách nhân viên trong phòng ban (bao gồm cả phòng ban con)
            var deptIds = await GetDepartmentHierarchyIdsAsync(departmentId);
            var employees = await _context.Employees
                .Where(e => deptIds.Contains(e.DepartmentId))
                .OrderBy(e => e.FullName)
                .ToListAsync();

            var employeeIds = employees.Select(e => e.Id).ToList();

            // 3. Lấy assignments trong tháng
            var assignments = await _context.OvertimeAssignments
                .Where(a => employeeIds.Contains(a.EmployeeId) && a.Date.Date >= startDate && a.Date.Date <= endDate)
                .ToListAsync();

            foreach (var emp in employees)
            {
                var row = new AttendanceGridRowDto
                {
                    EmployeeId = emp.Id,
                    EmployeeName = emp.FullName,
                    DailyValues = new List<decimal>()
                };

                var empAssignments = assignments.Where(a => a.EmployeeId == emp.Id).ToDictionary(a => a.Date.Date);

                for (var d = startDate; d <= endDate; d = d.AddDays(1))
                {
                    if (empAssignments.TryGetValue(d.Date, out var assignment))
                    {
                        row.DailyValues.Add(assignment.AssignedMaxHours);
                    }
                    else
                    {
                        row.DailyValues.Add(0);
                    }
                }

                result.Rows.Add(row);
            }

            return result;
        }
        /// <summary>
        /// Tính toán và lưu dữ liệu vào bảng công chi tiết (AttendanceDetail) ngay sau khi nhân viên kết thúc ca
        /// Áp dụng đúng triết lý: Min(Thực tế, Được giao)
        /// </summary>
        private async Task ComputeAndSaveAttendanceDetailAsync(int employeeId, DateTime date)
        {
            var emp = await _context.Employees.Include(e => e.Shift).FirstOrDefaultAsync(e => e.Id == employeeId);
            if (emp == null) return;

            // 1. Lấy records check-in/out của ngày hôm nay
            var records = await _context.TimeAttendanceRecords
                .Include(r => r.WorkSchedule)
                    .ThenInclude(ws => ws.WorkShift)
                .Where(r => r.EmployeeId == employeeId && r.Date == date.Date)
                .ToListAsync();

            var checkIn = records.Where(r => r.Type == "CheckIn").OrderBy(r => r.Timestamp).FirstOrDefault();
            var checkOut = records.Where(r => r.Type == "CheckOut").OrderByDescending(r => r.Timestamp).FirstOrDefault();

            if (checkIn == null) return;

            // 2. Xác định ca làm việc
            var shift = checkIn.WorkSchedule?.WorkShift ?? emp.Shift;
            if (shift == null) return;

            var shiftStartDt = date.Date.Add(shift.StartTime);
            var shiftEndDt = date.Date.Add(shift.EndTime);
            if (shift.EndTime <= shift.StartTime) shiftEndDt = shiftEndDt.AddDays(1); // Ca đêm

            // 3. Grace periods
            const int CHECK_IN_GRACE_BEFORE_MINUTES = 30;
            const int CHECK_OUT_GRACE_AFTER_MINUTES = 15;
            DateTime checkInGraceStart = shiftStartDt.AddMinutes(-CHECK_IN_GRACE_BEFORE_MINUTES);
            DateTime checkOutGraceEnd = shiftEndDt.AddMinutes(CHECK_OUT_GRACE_AFTER_MINUTES);

            // 4. Kiểm tra trễ/sớm
            bool isLate = checkIn.Timestamp > shiftStartDt;
            bool isEarlyLeave = checkOut != null && checkOut.Timestamp < shiftEndDt;

            TimeSpan snappedIn = isLate ? checkIn.Timestamp.TimeOfDay : shift.StartTime;
            TimeSpan snappedOut = shift.EndTime;

            // 5. TÍNH OT (LUẬT CAPPING)
            decimal otHours = 0;
            var todayAssignment = await _context.OvertimeAssignments
                .FirstOrDefaultAsync(oa => oa.EmployeeId == employeeId && oa.Date.Date == date.Date);

            if (checkOut != null)
            {
                if (isEarlyLeave)
                {
                    snappedOut = checkOut.Timestamp.TimeOfDay;
                }
                else if (todayAssignment != null && checkOut.Timestamp > checkOutGraceEnd)
                {
                    // CÓ KẾ HOẠCH OT
                    double actualOtMins = (checkOut.Timestamp - shiftEndDt).TotalMinutes;
                    double assignedOtMins = (double)todayAssignment.AssignedMaxHours * 60.0;

                    // Luật: Min (Thực tế, Được giao)
                    double validOtMins = Math.Min(actualOtMins, assignedOtMins);
                    if (validOtMins > 0)
                    {
                        // Làm tròn xuống block 30p
                        otHours = (decimal)(Math.Floor(validOtMins / 30.0) * 0.5);
                        DateTime finalOutDt = shiftEndDt.AddHours((double)otHours);
                        snappedOut = finalOutDt.TimeOfDay;
                    }
                }
            }

            // 6. Tính số công (WorkingDays) dựa trên quy tắc vi phạm
            decimal workingDays = 0;
            decimal workingHours = 0;
            if (checkOut != null)
            {
                if (!isLate && !isEarlyLeave) { workingDays = 1.0m; workingHours = 8.0m; }
                else if (isLate && isEarlyLeave) { workingDays = 0m; workingHours = 0m; }
                else { workingDays = 0.5m; workingHours = 4.0m; }
            }

            // 7. Lưu vào AttendanceDetail
            var existingDetail = await _context.AttendanceDetails
                .FirstOrDefaultAsync(d => d.EmployeeId == employeeId && d.Date == date.Date);

            string statusLabel = "Đúng giờ";
            if (isLate && isEarlyLeave) statusLabel = "Trễ & Sớm";
            else if (isLate) statusLabel = "Đi muộn";
            else if (isEarlyLeave) statusLabel = "Về sớm";
            else if (checkOut == null) statusLabel = "Chưa ra ca";

            if (existingDetail != null)
            {
                existingDetail.CheckInTime = snappedIn;
                existingDetail.CheckOutTime = checkOut != null ? snappedOut : null;
                existingDetail.IsLate = isLate;
                existingDetail.IsEarlyLeave = isEarlyLeave;
                existingDetail.OTHours = otHours;
                existingDetail.WorkingDays = workingDays;
                existingDetail.WorkingHours = workingHours;
                existingDetail.Status = statusLabel;
                existingDetail.CheckInCount = records.Count(r => r.Type == "CheckIn");
                existingDetail.CheckOutCount = records.Count(r => r.Type == "CheckOut");
                existingDetail.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _context.AttendanceDetails.Add(new AttendanceDetail
                {
                    EmployeeId = employeeId,
                    Date = date.Date,
                    WorkShiftId = shift.Id,
                    CheckInTime = snappedIn,
                    CheckOutTime = checkOut != null ? snappedOut : null,
                    IsLate = isLate,
                    IsEarlyLeave = isEarlyLeave,
                    WorkingHours = workingHours,
                    WorkingDays = workingDays,
                    OTHours = otHours,
                    Status = statusLabel,
                    CheckInCount = 1,
                    CheckOutCount = (checkOut != null ? 1 : 0),
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();
            
            // AUTOMATION: Update the monthly summary (AttendanceSummary)
            await UpdateAttendanceSummaryForEmployeeAsync(employeeId, date);
        }

        private async Task UpdateAttendanceSummaryForEmployeeAsync(int employeeId, DateTime date)
        {
            // Find current active period for this date
            var period = await _context.SchedulePeriods
                .FirstOrDefaultAsync(p => date.Date >= p.StartDate.Date && date.Date <= p.EndDate.Date);
            
            if (period == null) return;

            var details = await _context.AttendanceDetails
                .Where(d => d.EmployeeId == employeeId && d.Date >= period.StartDate && d.Date <= period.EndDate)
                .ToListAsync();

            var summary = await _context.AttendanceSummaries
                .FirstOrDefaultAsync(s => s.EmployeeId == employeeId && s.PeriodId == period.Id);

            if (summary == null)
            {
                summary = new AttendanceSummary
                {
                    EmployeeId = employeeId,
                    PeriodId = period.Id,
                    Status = TimesheetStatus.Draft,
                    CreatedAt = DateTime.UtcNow
                };
                _context.AttendanceSummaries.Add(summary);
            }

            // Recalculate everything from details
            summary.TotalWorkingDays = details.Count(d => d.CheckInTime != null);
            summary.AdjustedWorkingDays = details.Sum(d => d.WorkingDays);
            summary.LateDays = details.Count(d => d.IsLate);
            summary.EarlyLeaveDays = details.Count(d => d.IsEarlyLeave);
            summary.TotalWorkingHours = details.Sum(d => d.WorkingHours);
            summary.OvertimeHours = details.Sum(d => d.OTHours);
            summary.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        public async Task<AttendanceRecordDto> ScanAttendanceByCodeAsync(string employeeCode, string location, string deviceInfo)
        {
            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.EmployeeCode == employeeCode);
            if (employee == null) throw new InvalidOperationException("Không tìm thấy nhân viên với mã này.");

            var today = DateTime.Today;
            var existingCheckIn = await _context.TimeAttendanceRecords
                .FirstOrDefaultAsync(r => r.EmployeeId == employee.Id && r.Date == today && r.Type == "CheckIn");

            if (existingCheckIn == null)
            {
                return await CheckInAsync(new CheckInDto
                {
                    EmployeeId = employee.Id,
                    Location = location,
                    DeviceInfo = deviceInfo,
                    Note = "Quét mã vạch"
                });
            }
            else
            {
                return await CheckOutAsync(new CheckOutDto
                {
                    EmployeeId = employee.Id,
                    Location = location,
                    DeviceInfo = deviceInfo,
                    Note = "Quét mã vạch"
                });
            }
        }

        public async Task<string> ExportAndCleanupOldAttendanceAsync(int month, int year)
        {
            // Placeholder for data retention logic
            return await Task.FromResult($"Đã thực hiện lưu trữ và dọn dẹp dữ liệu chấm công tháng {month}/{year}.");
        }

        public async Task<bool> PublishOvertimePlanAsync(int planId, int userId)
        {
            var plan = await _context.OvertimePlans.FindAsync(planId);
            if (plan == null) throw new InvalidOperationException("Không tìm thấy kế hoạch tăng ca.");
            
            // Logic: Mặc định là Approved khi gửi đi
            plan.Status = "Approved";
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ConfirmOvertimeAssignmentAsync(int assignmentId, int employeeId)
        {
            var assignment = await _context.OvertimeAssignments.FindAsync(assignmentId);
            if (assignment == null) throw new InvalidOperationException("Không tìm thấy phân công tăng ca.");
            if (assignment.EmployeeId != employeeId) throw new UnauthorizedAccessException("Bạn không có quyền xác nhận thay nhân viên khác.");

            assignment.IsConfirmed = true;
            assignment.ConfirmedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        private async Task<List<int>> GetDepartmentHierarchyIdsAsync(int departmentId)
        {
            var result = new List<int> { departmentId };
            
            // Lấy trực tiếp các phòng ban con cấp 1
            var children = await _context.Departments
                .Where(d => d.ParentDepartmentId == departmentId)
                .Select(d => d.Id)
                .ToListAsync();

            foreach (var childId in children)
            {
                result.AddRange(await GetDepartmentHierarchyIdsAsync(childId));
            }

            return result.Distinct().ToList();
        }
        public async Task<byte[]> ExportTimesheetToExcelAsync(int departmentId, int periodId)
        {
            var grid = await GetDepartmentAttendanceGridAsync(departmentId, periodId);
            var period = await _context.SchedulePeriods.FindAsync(periodId);
            var dept = await _context.Departments.FindAsync(departmentId);

            using (var workbook = new XLWorkbook())
            {
                var worksheet = workbook.Worksheets.Add("Bảng công");

                // Style
                var headerRow = worksheet.Row(1);
                headerRow.Style.Font.Bold = true;
                headerRow.Style.Fill.BackgroundColor = XLColor.LightGray;

                // Headers
                worksheet.Cell(1, 1).Value = "Mã NV";
                worksheet.Cell(1, 2).Value = "Họ và tên";
                
                for (int i = 0; i < grid.DateHeaders.Count; i++)
                {
                    worksheet.Cell(1, i + 3).Value = grid.DateHeaders[i];
                }
                
                worksheet.Cell(1, grid.DateHeaders.Count + 3).Value = "Tổng công (OT)";

                // Data
                for (int r = 0; r < grid.Rows.Count; r++)
                {
                    var row = grid.Rows[r];
                    var excelRow = r + 2;
                    
                    worksheet.Cell(excelRow, 1).Value = row.EmployeeId;
                    worksheet.Cell(excelRow, 2).Value = row.EmployeeName;
                    
                    for (int c = 0; c < row.DailyValues.Count; c++)
                    {
                        worksheet.Cell(excelRow, c + 3).Value = (double)row.DailyValues[c];
                    }
                    
                    worksheet.Cell(excelRow, row.DailyValues.Count + 3).Value = (double)row.TotalOT;
                }

                worksheet.Columns().AdjustToContents();

                using (var stream = new MemoryStream())
                {
                    workbook.SaveAs(stream);
                    return stream.ToArray();
                }
            }
        }
    }
}

