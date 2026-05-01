using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using HRMS.Application.DTOs.Scheduling;
using HRMS.Application.Interfaces;
using HRMS.Domain.Entities;
using HRMS.Domain.Enums;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HRMS.Infrastructure.Services
{
    public class ShiftChangeRequestService : IShiftChangeRequestService
    {
        private readonly HRMSDbContext _context;
        private readonly INotificationService _notificationService;

        public ShiftChangeRequestService(HRMSDbContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<int> CreateRequestAsync(CreateShiftChangeRequestDto dto, ClaimsPrincipal user)
        {
            var userIdStr = user.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
                throw new UnauthorizedAccessException("Người dùng chưa đăng nhập.");

            var employee = await _context.Employees
                .Include(e => e.Contracts)
                .FirstOrDefaultAsync(e => e.UserId == userId);

            if (employee == null)
                throw new Exception("Không tìm thấy thông tin nhân viên.");

            var activeContract = employee.Contracts.FirstOrDefault(c => c.Status == ContractStatus.Active);
            int? currentShiftId = activeContract?.ShiftId;

            // Nếu không có hợp đồng có shift, thử lấy từ lịch cũ hoặc DepartmentDefaultShift
            if (currentShiftId == null)
            {
                var defaultShift = await _context.DepartmentDefaultShifts
                    .FirstOrDefaultAsync(d => d.DepartmentId == employee.DepartmentId);
                currentShiftId = defaultShift?.WorkShiftId;
            }

            if (dto.StartDate > dto.EndDate)
                throw new ArgumentException("Ngày bắt đầu không được lớn hơn ngày kết thúc.");

            var request = new ShiftChangeRequest
            {
                EmployeeId = employee.Id,
                RequestedShiftId = dto.RequestedShiftId,
                CurrentShiftId = currentShiftId,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Reason = dto.Reason,
                Status = ShiftChangeRequestStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };

            _context.ShiftChangeRequests.Add(request);
            await _context.SaveChangesAsync();
            
            // Notify Department Head (Manager)
            var deptHeadEmpId = await GetDepartmentHeadEmployeeId(employee.DepartmentId);
            if (deptHeadEmpId.HasValue)
            {
                await _notificationService.CreateNotificationAsync(new Application.DTOs.Notification.CreateNotificationDto
                {
                    EmployeeId = deptHeadEmpId.Value,
                    Title = "Đơn xin đổi ca mới",
                    Message = $"Nhân viên {employee.FullName} vừa gửi đơn xin đổi ca.",
                    Type = "ShiftChange",
                    RelatedId = request.Id.ToString()
                });
            }

            return request.Id;
        }

        private async Task<int?> GetDepartmentHeadEmployeeId(int departmentId)
        {
             var mgr = await _context.Departments.Where(d => d.Id == departmentId).Select(d => d.Manager).FirstOrDefaultAsync();
             return mgr?.Id;
        }

        public async Task<IEnumerable<ShiftChangeRequestDto>> GetMyRequestsAsync(ClaimsPrincipal user)
        {
             var userIdStr = user.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
             if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
                 return new List<ShiftChangeRequestDto>();

             var employee = await _context.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
             if (employee == null) return new List<ShiftChangeRequestDto>();

             return await GetRequestDtosQuery(r => r.EmployeeId == employee.Id).ToListAsync();
        }

        public async Task<IEnumerable<ShiftChangeRequestDto>> GetPendingRequestsForDeptAsync(ClaimsPrincipal user)
        {
             var roles = user.Claims.Where(c => c.Type == ClaimTypes.Role).Select(c => c.Value).ToList();
             bool isHR = roles.Any(r => r == "Admin" || r == "HrAdmin" || r == "CnbSpecialist");

             if (isHR)
             {
                 return await GetRequestDtosQuery(r => r.Status == ShiftChangeRequestStatus.Pending).ToListAsync();
             }

             int? deptId = GetDepartmentIdFromUser(user);
             if (!deptId.HasValue) return new List<ShiftChangeRequestDto>();

             return await GetRequestDtosQuery(r => r.Employee.DepartmentId == deptId.Value && r.Status == ShiftChangeRequestStatus.Pending).ToListAsync();
        }

        public async Task<IEnumerable<ShiftChangeRequestDto>> GetAllRequestsForDeptAsync(ClaimsPrincipal user)
        {
             var roles = user.Claims.Where(c => c.Type == ClaimTypes.Role).Select(c => c.Value).ToList();
             bool isHR = roles.Any(r => r == "Admin" || r == "HrAdmin" || r == "CnbSpecialist");

             if (isHR)
             {
                 return await GetRequestDtosQuery(_ => true).ToListAsync();
             }

             int? deptId = GetDepartmentIdFromUser(user);
             if (!deptId.HasValue) return new List<ShiftChangeRequestDto>();

             return await GetRequestDtosQuery(r => r.Employee.DepartmentId == deptId.Value).ToListAsync();
        }

        private int? GetDepartmentIdFromUser(ClaimsPrincipal user)
        {
            var deptClaim = user.Claims.FirstOrDefault(c => c.Type == "DepartmentId")?.Value;
            if (int.TryParse(deptClaim, out int deptId)) return deptId;
            return null;
        }

        private IQueryable<ShiftChangeRequestDto> GetRequestDtosQuery(System.Linq.Expressions.Expression<Func<ShiftChangeRequest, bool>> predicate)
        {
            return _context.ShiftChangeRequests
                .Include(r => r.Employee).ThenInclude(e => e.Department)
                .Include(r => r.RequestedShift)
                .Include(r => r.CurrentShift)
                .Include(r => r.Approver)
                .Where(predicate)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new ShiftChangeRequestDto
                {
                    Id = r.Id,
                    EmployeeId = r.EmployeeId,
                    EmployeeName = r.Employee.FullName,
                    EmployeeCode = r.Employee.EmployeeCode,
                    DepartmentName = r.Employee.Department.DepartmentName,
                    RequestedShiftId = r.RequestedShiftId,
                    RequestedShiftName = r.RequestedShift.ShiftName,
                    RequestedShiftCode = r.RequestedShift.ShiftCode,
                    RequestedShiftTime = $"{r.RequestedShift.StartTime:hh\\:mm} - {r.RequestedShift.EndTime:hh\\:mm}",
                    CurrentShiftId = r.CurrentShiftId,
                    CurrentShiftName = r.CurrentShift != null ? r.CurrentShift.ShiftName : "Không xác định",
                    StartDate = r.StartDate,
                    EndDate = r.EndDate,
                    Reason = r.Reason,
                    Status = r.Status.ToString(),
                    StatusLabel = r.Status == ShiftChangeRequestStatus.Pending ? "Chờ duyệt" : (r.Status == ShiftChangeRequestStatus.Approved ? "Đã duyệt" : "Đã từ chối"),
                    ApproverId = r.ApproverId,
                    ApproverName = r.Approver != null ? r.Approver.FullName : string.Empty,
                    ApprovedAt = r.ApprovedAt,
                    RejectReason = r.RejectReason,
                    CreatedAt = r.CreatedAt
                });
        }

        public async Task ApproveRequestAsync(int requestId, ClaimsPrincipal approverUser)
        {
            var approverIdStr = approverUser.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(approverIdStr) || !int.TryParse(approverIdStr, out int approverUserId))
                throw new UnauthorizedAccessException("Người dùng chưa đăng nhập.");

            var approverEmp = await _context.Employees.FirstOrDefaultAsync(e => e.UserId == approverUserId);
            
            var request = await _context.ShiftChangeRequests
                .Include(r => r.Employee)
                .FirstOrDefaultAsync(r => r.Id == requestId);

            if (request == null) throw new KeyNotFoundException("Không tìm thấy đơn.");
            if (request.Status != ShiftChangeRequestStatus.Pending) throw new InvalidOperationException("Đơn đã được xử lý.");

            request.Status = ShiftChangeRequestStatus.Approved;
            request.ApproverId = approverEmp?.Id;
            request.ApprovedAt = DateTime.UtcNow;

            // Auto-update work schedules
            var periods = await _context.SchedulePeriods.ToListAsync();
            
            for (DateTime date = request.StartDate; date <= request.EndDate; date = date.AddDays(1))
            {
                var targetPeriod = periods.FirstOrDefault(p => date >= p.StartDate && date <= p.EndDate);
                if (targetPeriod == null) continue; // Bỏ qua nếu ko có period cấu hình cho ngày đó

                var existingSchedule = await _context.WorkSchedules
                    .FirstOrDefaultAsync(ws => ws.EmployeeId == request.EmployeeId && ws.WorkingDate.Date == date.Date);

                if (existingSchedule != null)
                {
                    existingSchedule.WorkShiftId = request.RequestedShiftId;
                    existingSchedule.Note = string.IsNullOrEmpty(existingSchedule.Note) 
                        ? $"Đổi ca (Đơn #{requestId})" 
                        : existingSchedule.Note + $" | Đổi ca (#{requestId})";
                    existingSchedule.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    var newSchedule = new WorkSchedule
                    {
                        EmployeeId = request.EmployeeId,
                        WorkShiftId = request.RequestedShiftId,
                        WorkingDate = date,
                        PeriodId = targetPeriod.Id,
                        Note = $"Đổi ca (Đơn #{requestId})",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.WorkSchedules.Add(newSchedule);
                }
            }

            await _context.SaveChangesAsync();

            // Notify Emloyee
             await _notificationService.CreateNotificationAsync(new Application.DTOs.Notification.CreateNotificationDto
             {
                 EmployeeId = request.EmployeeId,
                 Title = "Đơn xin đổi ca đã được duyệt",
                 Message = $"Đơn xin đổi ca từ ngày {request.StartDate:dd/MM} đến {request.EndDate:dd/MM} đã được duyệt.",
                 Type = "ShiftChange",
                 RelatedId = request.Id.ToString()
             });
        }

        public async Task RejectRequestAsync(int requestId, string reason, ClaimsPrincipal approverUser)
        {
            var approverIdStr = approverUser.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(approverIdStr) || !int.TryParse(approverIdStr, out int approverUserId))
                throw new UnauthorizedAccessException("Người dùng chưa đăng nhập.");

            var approverEmp = await _context.Employees.FirstOrDefaultAsync(e => e.UserId == approverUserId);
            
            var request = await _context.ShiftChangeRequests
                .Include(r => r.Employee)
                .FirstOrDefaultAsync(r => r.Id == requestId);

            if (request == null) throw new KeyNotFoundException("Không tìm thấy đơn.");
            if (request.Status != ShiftChangeRequestStatus.Pending) throw new InvalidOperationException("Đơn đã được xử lý.");

            request.Status = ShiftChangeRequestStatus.Rejected;
            request.RejectReason = reason;
            request.ApproverId = approverEmp?.Id;
            request.ApprovedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

             // Notify Emloyee
             await _notificationService.CreateNotificationAsync(new Application.DTOs.Notification.CreateNotificationDto
             {
                 EmployeeId = request.EmployeeId,
                 Title = "Đơn xin đổi ca bị từ chối",
                 Message = $"Đơn xin đổi ca từ {request.StartDate:dd/MM} đến {request.EndDate:dd/MM} đã bị từ chối. Lý do: {reason}",
                 Type = "ShiftChange",
                 RelatedId = request.Id.ToString()
             });
        }
    }
}
