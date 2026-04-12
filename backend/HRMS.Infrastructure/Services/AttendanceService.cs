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

            // Workflow: Head (Level 1 Approval) -> Manager (Level 2 Finalization/Locking)
            if (isHead && (summary.Status == TimesheetStatus.Draft || summary.Status == TimesheetStatus.PendingHeadApproval))
            {
                // Head approves the draft or the pending-head-level record
                summary.Status = TimesheetStatus.PendingManagerApproval;
            }
            else if ((isManager || isAdmin) && summary.Status == TimesheetStatus.PendingManagerApproval)
            {
                // Manager/Admin finalizes the record that was approved by Head
                summary.Status = TimesheetStatus.Approved;
            }
            else if (isAdmin && summary.Status == TimesheetStatus.Draft)
            {
                // Admin can jump levels if needed (optional, but let's allow it for flexibility)
                summary.Status = TimesheetStatus.Approved;
            }
            else
            {
                // Invalid transition for the given role
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

                if (isHead)
                    summary.Status = TimesheetStatus.PendingManagerApproval;
                else if (isManager || isAdmin)
                    summary.Status = TimesheetStatus.Approved;
                
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

                    // Lấy số giờ OT nếu có (Chỉ tính nếu đơn đã được DUYỆT)
                    decimal otHours = 0;
                    var todayOtRequest = await _context.OvertimeRequests
                        .Where(or => or.EmployeeId == emp.Id && 
                                     or.Date == dayGroup.Key &&
                                     or.Status == "Approved")
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
                                // Snap về shiftEnd nếu trong grace period và KHÔNG có OT
                                if (todayOtRequest == null && checkOut.Timestamp <= checkOutGraceEnd)
                                {
                                    snappedCheckOutTime = shiftEnd;
                                }
                                else if (todayOtRequest == null)
                                {
                                    // Về muộn quá grace nhưng không có OT -> Vẫn chỉ tính đến shiftEnd (theo luật cũ hoặc snap)
                                    snappedCheckOutTime = shiftEnd;
                                }
                                else 
                                {
                                    // CÓ ĐƠN OT ĐÃ DUYỆT
                                    double actualOtMins = (checkOut.Timestamp - shiftEndDt).TotalMinutes;
                                    double requestedOtMins = (todayOtRequest.EndTime - todayOtRequest.StartTime).TotalMinutes;
                                    if (todayOtRequest.EndTime < todayOtRequest.StartTime) requestedOtMins += 24 * 60;

                                    double validOtMins = Math.Min(actualOtMins, requestedOtMins);
                                    if (validOtMins < 0) validOtMins = 0;

                                    // Làm tròn: 45p -> 30p, 1h15p -> 1h (Sàn về 0.5h)
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

        public async Task<OvertimeRequestDto> SubmitOvertimeRequestAsync(int employeeId, CreateOvertimeRequestDto dto)
        {
            // 1. Kiểm tra ngày đăng ký (không được trong quá khứ)
            if (dto.Date.Date < DateTime.Today)
                throw new InvalidOperationException("Đơn xin tăng ca không được gửi cho các ngày trong quá khứ.");

            var emp = await _context.Employees.FindAsync(employeeId);
            if (emp == null) throw new InvalidOperationException("Không tìm thấy nhân viên.");

            var startTs = TimeSpan.Parse(dto.StartTime);
            var endTs = TimeSpan.Parse(dto.EndTime);
            var duration = endTs - startTs;
            if (duration.TotalMinutes < 30)
                throw new InvalidOperationException("Thời gian tăng ca tối thiểu là 30 phút.");

            var request = new OvertimeRequest
            {
                EmployeeId = employeeId,
                DepartmentId = emp.DepartmentId,
                Date = dto.Date.Date,
                StartTime = startTs,
                EndTime = endTs,
                Reason = dto.Reason,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                CreatedById = emp.UserId ?? employeeId // Gán UserId của người tạo
            };

            _context.OvertimeRequests.Add(request);

            try
            {
                await _context.SaveChangesAsync();
                return new OvertimeRequestDto
                {
                    Id = request.Id,
                    EmployeeId = request.EmployeeId,
                    EmployeeName = emp.FullName,
                    Date = request.Date,
                    StartTime = request.StartTime.ToString(@"hh\:mm"),
                    EndTime = request.EndTime.ToString(@"hh\:mm"),
                    TotalHours = (decimal)duration.TotalHours,
                    Reason = request.Reason ?? "",
                    Status = request.Status,
                    CreatedAt = request.CreatedAt
                };
            }
            catch (Exception ex)
            {
                var innerMsg = ex.InnerException?.Message ?? ex.Message;
                Console.WriteLine($"❌ [SubmitOvertimeRequest] SAVE ERROR: {ex.Message}");
                Console.WriteLine($"❌ [SubmitOvertimeRequest] INNER ERROR: {innerMsg}");
                throw new Exception($"Lỗi hệ thống: {innerMsg}");
            }
        }

        public async Task<bool> ReviewOvertimeRequestAsync(int requestId, int approverId, string status, string note)
        {
            var req = await _context.OvertimeRequests
                .Include(r => r.Employee)
                .FirstOrDefaultAsync(r => r.Id == requestId);
            
            if (req == null) return false;

            req.Status = status; // Approved / Rejected
            req.ApprovedById = approverId;
            req.ApprovedAt = DateTime.UtcNow;
            req.Note = note;

            await _context.SaveChangesAsync();

            // Gửi thông báo cho nhân viên
            string title = status == "Approved" ? "Đơn tăng ca đã được DUYỆT" : "Đơn tăng ca bị TỪ CHỐI";
            string msg = status == "Approved" 
                ? $"Đơn tăng ca ngày {req.Date:dd/MM/yyyy} của bạn đã được duyệt."
                : $"Đơn tăng ca ngày {req.Date:dd/MM/yyyy} của bạn bị từ chối. Lý do: {note}";

            await _notificationService.CreateNotificationAsync(new HRMS.Application.DTOs.Notification.CreateNotificationDto
            {
                EmployeeId = req.EmployeeId,
                Title = title,
                Message = msg,
                Type = "Overtime",
                RelatedId = req.Id.ToString()
            });

            return true;
        }

        public async Task<List<OvertimeRequestDto>> GetMyOvertimeRequestsAsync(int employeeId)
        {
            var requests = await _context.OvertimeRequests
                .Where(r => r.EmployeeId == employeeId)
                .Include(r => r.Employee)
                .Include(r => r.ApprovedBy)
                .OrderByDescending(r => r.Date)
                .ToListAsync();

            return requests.Select(r => new OvertimeRequestDto
            {
                Id = r.Id,
                EmployeeId = r.EmployeeId,
                EmployeeName = r.Employee?.FullName ?? "Unknown",
                Date = r.Date,
                StartTime = r.StartTime.ToString(@"hh\:mm"),
                EndTime = r.EndTime.ToString(@"hh\:mm"),
                TotalHours = (decimal)(r.EndTime - r.StartTime).TotalHours,
                Reason = r.Reason ?? "",
                Status = r.Status,
                ApproverName = r.ApprovedBy?.FullName,
                Note = r.Note,
                CreatedAt = r.CreatedAt
            }).ToList();
        }

        public async Task<List<OvertimeRequestDto>> GetOvertimeToApproveAsync(int departmentId)
        {
            var requests = await _context.OvertimeRequests
                .Where(r => r.DepartmentId == departmentId && r.Status == "Pending")
                .Include(r => r.Employee)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return requests.Select(r => new OvertimeRequestDto
            {
                Id = r.Id,
                EmployeeId = r.EmployeeId,
                EmployeeName = r.Employee?.FullName ?? "Unknown",
                Date = r.Date,
                StartTime = r.StartTime.ToString(@"hh\:mm"),
                EndTime = r.EndTime.ToString(@"hh\:mm"),
                TotalHours = (decimal)(r.EndTime - r.StartTime).TotalHours,
                Reason = r.Reason ?? "",
                Status = r.Status,
                CreatedAt = r.CreatedAt
            }).ToList();
        }

        public async Task<List<OvertimeRequestDto>> GetOvertimeRequestsByDepartmentAsync(int departmentId)
        {
            var requests = await _context.OvertimeRequests
                .Where(r => r.DepartmentId == departmentId)
                .Include(r => r.Employee)
                .Include(r => r.ApprovedBy)
                .OrderByDescending(r => r.Date)
                .ToListAsync();

            return requests.Select(r => new OvertimeRequestDto
            {
                Id = r.Id,
                EmployeeId = r.EmployeeId,
                EmployeeName = r.Employee?.FullName ?? "Unknown",
                Date = r.Date,
                StartTime = r.StartTime.ToString(@"hh\:mm"),
                EndTime = r.EndTime.ToString(@"hh\:mm"),
                TotalHours = (decimal)(r.EndTime - r.StartTime).TotalHours,
                Reason = r.Reason ?? "",
                Status = r.Status,
                ApproverName = r.ApprovedBy?.FullName,
                Note = r.Note,
                CreatedAt = r.CreatedAt
            }).ToList();
        }
        private async Task<List<int>> GetDepartmentHierarchyIdsAsync(int parentDeptId)
        {
            var allDepts = await _context.Departments
                .Select(d => new { d.Id, d.ParentDepartmentId })
                .ToListAsync();

            var result = new List<int> { parentDeptId };
            
            void FindSubDepts(int pid)
            {
                var subs = allDepts.Where(d => d.ParentDepartmentId == pid).Select(d => d.Id).ToList();
                foreach (var sub in subs)
                {
                    if (!result.Contains(sub))
                    {
                        result.Add(sub);
                        FindSubDepts(sub);
                    }
                }
            }

            FindSubDepts(parentDeptId);
            return result;
        }

        public async Task<string> ExportAndCleanupOldAttendanceAsync(int month, int year)
        {
            var startDate = new DateTime(year, month, 1);
            var endDate = startDate.AddMonths(1).AddDays(-1);

            // Fetch details
            var details = await _context.AttendanceDetails
                .Include(d => d.Employee)
                .Where(d => d.Date >= startDate && d.Date <= endDate)
                .OrderBy(d => d.Date).ThenBy(d => d.EmployeeId)
                .ToListAsync();

            if (!details.Any())
            {
                return "Không có dữ liệu công trong tháng này để dọn dẹp.";
            }

            // Create CSV Content
            var csvBuilder = new System.Text.StringBuilder();
            
            // Header
            csvBuilder.AppendLine("Employee Code,Employee Name,Date,Check-In,Check-Out,CheckIn Count,CheckOut Count,Working Hours,Working Days,OT Hours,Status,Is Late,Is Early Leave");

            foreach(var d in details)
            {
                var row = $"{d.Employee?.EmployeeCode},\"{d.Employee?.FullName}\",{d.Date:yyyy-MM-dd},{d.CheckInTime},{d.CheckOutTime},{d.CheckInCount},{d.CheckOutCount},{d.WorkingHours},{d.WorkingDays},{d.OTHours},\"{d.Status}\",{d.IsLate},{d.IsEarlyLeave}";
                csvBuilder.AppendLine(row);
            }

            // Save to file
            var exportDir = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "wwwroot", "exports");
            if (!System.IO.Directory.Exists(exportDir))
            {
                System.IO.Directory.CreateDirectory(exportDir);
            }

            string fileName = $"AttendanceLog_{year}_{month:D2}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
            string filePath = System.IO.Path.Combine(exportDir, fileName);

            // Ghi file kèm UTF-8 BOM
            await System.IO.File.WriteAllTextAsync(filePath, csvBuilder.ToString(), new System.Text.UTF8Encoding(true));

            // Clean up Database
            _context.AttendanceDetails.RemoveRange(details);
            
            // Xoá luôn lịch sử bấm vân tay thô TimeAttendanceRecord
            var rawRecords = await _context.TimeAttendanceRecords
                .Where(r => r.Date >= startDate && r.Date <= endDate)
                .ToListAsync();
            _context.TimeAttendanceRecords.RemoveRange(rawRecords);

            await _context.SaveChangesAsync();

            return $"/exports/{fileName}";
        }

        public async Task<AttendanceRecordDto> ScanAttendanceByCodeAsync(string employeeCode, string location, string deviceInfo)
        {
            var employee = await _context.Employees
                .FirstOrDefaultAsync(e => e.EmployeeCode == employeeCode);

            if (employee == null)
            {
                throw new InvalidOperationException($"Không tìm thấy nhân viên với mã: {employeeCode}");
            }

            var today = DateTime.Today;

            // Kiểm tra xem đã check-in hôm nay chưa
            var checkInRecord = await _context.TimeAttendanceRecords
                .FirstOrDefaultAsync(r => r.EmployeeId == employee.Id && r.Date == today && r.Type == "CheckIn");

            if (checkInRecord == null)
            {
                // Thực hiện Check-in
                return await CheckInAsync(new CheckInDto
                {
                    EmployeeId = employee.Id,
                    Location = location,
                    DeviceInfo = deviceInfo,
                    Timestamp = DateTime.Now
                });
            }

            // Nếu đã check-in, kiểm tra xem đã check-out chưa
            var checkOutRecord = await _context.TimeAttendanceRecords
                .FirstOrDefaultAsync(r => r.EmployeeId == employee.Id && r.Date == today && r.Type == "CheckOut");

            if (checkOutRecord == null)
            {
                // Thực hiện Check-out
                return await CheckOutAsync(new CheckOutDto
                {
                    EmployeeId = employee.Id,
                    Location = location,
                    DeviceInfo = deviceInfo,
                    Timestamp = DateTime.Now
                });
            }

            throw new InvalidOperationException("Nhân viên này đã hoàn thành chấm công (vào và ra) trong ngày hôm nay.");
        }
    }
}
