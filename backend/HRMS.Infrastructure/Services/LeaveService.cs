using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HRMS.Application.DTOs.Leave;
using HRMS.Application.Interfaces;
using HRMS.Domain.Entities;
using HRMS.Domain.Enums;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HRMS.Infrastructure.Services
{
    public class LeaveService : ILeaveService
    {
        private readonly HRMSDbContext _context;
        private readonly INotificationService _notificationService;

        public LeaveService(HRMSDbContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        // ===== Reference data =====

        public async Task<IEnumerable<LeaveTypeDto>> GetLeaveTypesAsync()
        {
            return await _context.LeaveTypes
                .Where(lt => lt.IsActive)
                .Select(lt => new LeaveTypeDto
                {
                    Id = lt.Id,
                    Name = lt.Name,
                    Code = lt.Code,
                    Description = lt.Description,
                    IsPaid = lt.IsPaid,
                    DefaultDaysPerYear = lt.DefaultDaysPerYear
                })
                .ToListAsync();
        }

        // ===== Employee actions =====

        public async Task<IEnumerable<LeaveBalanceDto>> GetMyBalancesAsync(int employeeId, int year)
        {
            return await _context.LeaveBalances
                .Where(lb => lb.EmployeeId == employeeId && lb.Year == year)
                .Include(lb => lb.LeaveType)
                .Select(lb => new LeaveBalanceDto
                {
                    LeaveTypeId = lb.LeaveTypeId,
                    LeaveTypeName = lb.LeaveType.Name,
                    IsPaid = lb.LeaveType.IsPaid,
                    Year = lb.Year,
                    TotalDays = lb.TotalDays,
                    UsedDays = lb.UsedDays,
                    RemainingDays = lb.TotalDays - lb.UsedDays
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<LeaveRequestDto>> GetMyRequestsAsync(int employeeId)
        {
            return await _context.LeaveRequests
                .Where(lr => lr.EmployeeId == employeeId)
                .Include(lr => lr.LeaveType)
                .Include(lr => lr.Approver)
                .OrderByDescending(lr => lr.CreatedAt)
                .Select(lr => MapToDto(lr))
                .ToListAsync();
        }

        public async Task<LeaveRequestDto> CreateRequestAsync(int employeeId, LeaveRequestCreateDto dto)
        {
            // 1. Validate date range
            if (dto.ToDate < dto.FromDate)
                throw new InvalidOperationException("Ngày kết thúc không thể trước ngày bắt đầu.");

            // 2. Calculate working days based on schedule (with fallback)
            double totalDays = await CalculateWorkingDaysAsync(employeeId, dto.FromDate, dto.ToDate);
            if (totalDays <= 0)
                throw new InvalidOperationException("Không có ngày làm việc trong khoảng thời gian đã chọn.");

            // 3. Check for overlapping requests
            bool overlap = await _context.LeaveRequests.AnyAsync(lr =>
                lr.EmployeeId == employeeId &&
                lr.Status != LeaveStatus.Rejected &&
                lr.Status != LeaveStatus.Cancelled &&
                lr.FromDate <= dto.ToDate &&
                lr.ToDate >= dto.FromDate);

            if (overlap)
                throw new InvalidOperationException("Đã có đơn nghỉ phép trong khoảng thời gian này.");

            // 4. Check leave balance
            int year = dto.FromDate.Year;
            var balance = await _context.LeaveBalances
                .FirstOrDefaultAsync(lb => lb.EmployeeId == employeeId
                    && lb.LeaveTypeId == dto.LeaveTypeId
                    && lb.Year == year);

            if (balance == null)
                throw new InvalidOperationException("Bạn chưa có số dư nghỉ phép cho loại phép này trong năm nay.");

            double remaining = balance.TotalDays - balance.UsedDays;
            if (totalDays > remaining)
                throw new InvalidOperationException($"Số ngày nghỉ yêu cầu ({totalDays}) vượt quá số ngày còn lại ({remaining}).");

            // 5. Create request
            var request = new LeaveRequest
            {
                EmployeeId = employeeId,
                LeaveTypeId = dto.LeaveTypeId,
                FromDate = dto.FromDate,
                ToDate = dto.ToDate,
                TotalDays = totalDays,
                Reason = dto.Reason,
                Status = LeaveStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };

            _context.LeaveRequests.Add(request);
            await _context.SaveChangesAsync();

            // Reload with navigation properties
            await _context.Entry(request).Reference(r => r.LeaveType).LoadAsync();
            await _context.Entry(request).Reference(r => r.Employee).LoadAsync();

            return MapToDto(request);
        }

        public async Task<bool> CancelRequestAsync(int requestId, int employeeId)
        {
            var request = await _context.LeaveRequests
                .FirstOrDefaultAsync(lr => lr.Id == requestId && lr.EmployeeId == employeeId);

            if (request == null)
                throw new InvalidOperationException("Không tìm thấy đơn nghỉ phép.");

            if (request.Status != LeaveStatus.Pending)
                throw new InvalidOperationException("Chỉ có thể hủy đơn đang chờ duyệt.");

            request.Status = LeaveStatus.Cancelled;
            request.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        // ===== Manager actions =====

        public async Task<IEnumerable<LeaveRequestDto>> GetDepartmentRequestsAsync(int departmentId)
        {
            return await _context.LeaveRequests
                .Include(lr => lr.Employee)
                    .ThenInclude(e => e.User)
                        .ThenInclude(u => u.UserRoles)
                            .ThenInclude(ur => ur.Role)
                .Include(lr => lr.LeaveType)
                .Include(lr => lr.Approver)
                .Where(lr => lr.Employee.DepartmentId == departmentId && 
                             !lr.Employee.User.UserRoles.Any(ur => ur.Role.RoleName == "Admin"))
                .OrderByDescending(lr => lr.CreatedAt)
                .Select(lr => MapToDto(lr))
                .ToListAsync();
        }

        public async Task<IEnumerable<LeaveRequestDto>> GetRequestsToApproveAsync(int approverId, System.Security.Claims.ClaimsPrincipal user)
        {
            var query = _context.LeaveRequests
                .Include(lr => lr.Employee)
                    .ThenInclude(e => e.Position)
                .Include(lr => lr.Employee)
                    .ThenInclude(e => e.Department)
                .Include(lr => lr.LeaveType)
                .Include(lr => lr.Approver)
                .Where(lr => lr.Status == LeaveStatus.Pending);

            var isAdmin = user.IsInRole("Admin") || user.IsInRole("HrAdmin");
            var isManager = user.IsInRole("DepartmentManager");
            var isHead = user.IsInRole("DepartmentHead");

            if (isAdmin)
            {
                // Admins see all pending from everyone (except maybe other admins)
                query = query.Where(lr => !isAdmin || 
                                    !_context.UserRoles.Any(ur => ur.UserId == lr.Employee.UserId && 
                                                           (ur.Role.RoleName == "Admin" || ur.Role.RoleName == "HrAdmin")));
            }
            else if (isManager || isHead)
            {
                var deptIdString = user.FindFirst("DepartmentId")?.Value;
                if (int.TryParse(deptIdString, out int deptIdStr) && deptIdStr > 0)
                {
                    // Get managed departments
                    // Managers (Trưởng phòng) see self and children
                    // Heads (Trưởng bộ phận) ONLY see their exact department to ensure team isolation
                    List<int> deptIds;
                    if (isManager)
                    {
                        deptIds = await _context.Departments
                            .Where(d => d.Id == deptIdStr || d.ParentDepartmentId == deptIdStr)
                            .Select(d => d.Id)
                            .ToListAsync();
                    }
                    else
                    {
                        deptIds = new List<int> { deptIdStr };
                    }

                    // Roles for filtering logic
                    bool isAnyManager = isManager;
                    bool isOnlyHead = isHead && !isManager;

                    if (isOnlyHead)
                    {
                        // ONLY a Head (not a Manager): sees < 3 days AND NOT from other Heads in their team
                        query = query.Where(lr => lr.TotalDays < 3 && 
                                            !_context.UserRoles.Any(ur => ur.UserId == lr.Employee.UserId && ur.Role.RoleName == "DepartmentHead"));
                        
                        // Base Team filter
                        query = query.Where(lr => lr.Employee.DepartmentId == deptIdStr);
                    }
                    else if (isAnyManager)
                    {
                        // A Manager (Trưởng phòng) sees:
                        // 1. All requests from DepartmentHeads in their sub-depts (regardless of days)
                        // 2. Requests >= 3 days from regular employees in their sub-depts
                        
                        var headRole = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == "DepartmentHead");
                        int headRoleId = headRole?.Id ?? -1;

                        query = query.Where(lr => deptIds.Contains(lr.Employee.DepartmentId) && (
                            // All requests from Heads
                            _context.UserRoles.Any(ur => ur.UserId == lr.Employee.UserId && ur.RoleId == headRoleId) ||
                            // OR Requests >= 3 days from others
                            (lr.TotalDays >= 3)
                        ));
                    }
                }
                else return Enumerable.Empty<LeaveRequestDto>();
            }
            else
            {
                return Enumerable.Empty<LeaveRequestDto>();
            }

            var requests = await query.OrderByDescending(lr => lr.CreatedAt).ToListAsync();
            return requests.Select(lr => MapToDto(lr));
        }

        public async Task<IEnumerable<LeaveRequestDto>> GetApprovalHistoryAsync(int approverId)
        {
            var history = await _context.LeaveRequests
                .Where(lr => lr.ApproverId == approverId && lr.Status != LeaveStatus.Pending)
                .Include(lr => lr.LeaveType)
                .Include(lr => lr.Employee)
                    .ThenInclude(e => e.Position)
                .Include(lr => lr.Employee)
                    .ThenInclude(e => e.Department)
                .OrderByDescending(lr => lr.ApprovedAt)
                .ToListAsync();

            return history.Select(lr => MapToDto(lr));
        }

        private bool IsAuthorizedToDecide(LeaveRequest request, System.Security.Claims.ClaimsPrincipal user)
        {
            if (user.IsInRole("Admin") || user.IsInRole("HrAdmin")) return true;

            if (user.IsInRole("DepartmentManager"))
            {
                var deptId = int.Parse(user.FindFirst("DepartmentId")?.Value ?? "0");
                
                // Fetch sub-departments to see if this employee belongs to the manager's domain
                var isUnderManager = _context.Employees
                    .Include(e => e.Department)
                    .Any(e => e.Id == request.EmployeeId && 
                             (e.DepartmentId == deptId || e.Department.ParentDepartmentId == deptId));

                var isRequesterHead = _context.UserRoles
                    .Include(ur => ur.Role)
                    .Any(ur => ur.UserId == request.Employee.UserId && ur.Role.RoleName == "DepartmentHead");

                if (isUnderManager && (request.TotalDays >= 3 || isRequesterHead)) return true;
            }

            if (user.IsInRole("DepartmentHead"))
            {
                var deptId = int.Parse(user.FindFirst("DepartmentId")?.Value ?? "0");
                
                // Requirement check for Head: Same department, NOT another Head, and Short-term (< 3 days)
                var isRequesterHead = _context.UserRoles
                    .Include(ur => ur.Role)
                    .Any(ur => ur.UserId == request.Employee.UserId && ur.Role.RoleName == "DepartmentHead");

                if (request.Employee.DepartmentId == deptId && !isRequesterHead && request.TotalDays < 3) return true;
            }

            return false;
        }

        public async Task<bool> ApproveRequestAsync(int requestId, int approverId, System.Security.Claims.ClaimsPrincipal user, string? note)
        {
            var request = await _context.LeaveRequests
                .Include(lr => lr.Employee)
                .FirstOrDefaultAsync(lr => lr.Id == requestId);

            if (request == null) throw new InvalidOperationException("Không tìm thấy đơn nghỉ phép.");
            if (request.Status != LeaveStatus.Pending) throw new InvalidOperationException("Đơn này không còn ở trạng thái chờ duyệt.");

            if (!IsAuthorizedToDecide(request, user))
                throw new UnauthorizedAccessException("Bạn không có quyền duyệt đơn này.");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                request.Status = LeaveStatus.Approved;
                request.ApproverId = approverId;
                request.ApproverNote = note;
                request.ApprovedAt = DateTime.UtcNow;
                request.UpdatedAt = DateTime.UtcNow;

                int year = request.FromDate.Year;
                var balance = await _context.LeaveBalances
                    .FirstOrDefaultAsync(lb => lb.EmployeeId == request.EmployeeId
                        && lb.LeaveTypeId == request.LeaveTypeId
                        && lb.Year == year);

                if (balance != null)
                {
                    balance.UsedDays += request.TotalDays;
                    balance.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Create notification for employee
                await _notificationService.CreateNotificationAsync(new HRMS.Application.DTOs.Notification.CreateNotificationDto
                {
                    EmployeeId = request.EmployeeId,
                    Title = "Đơn nghỉ phép của bạn đã được DUYỆT",
                    Message = $"Đơn nghỉ phép từ ngày {request.FromDate:dd/MM/yyyy} đến {request.ToDate:dd/MM/yyyy} của bạn đã được duyệt.",
                    Type = "Leave",
                    RelatedId = request.Id.ToString()
                });

                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> RejectRequestAsync(int requestId, int approverId, System.Security.Claims.ClaimsPrincipal user, string? note)
        {
            var request = await _context.LeaveRequests
                .Include(lr => lr.Employee)
                .FirstOrDefaultAsync(lr => lr.Id == requestId);

            if (request == null) throw new InvalidOperationException("Không tìm thấy đơn nghỉ phép.");
            if (request.Status != LeaveStatus.Pending) throw new InvalidOperationException("Đơn này không còn ở trạng thái chờ duyệt.");

            if (!IsAuthorizedToDecide(request, user))
                throw new UnauthorizedAccessException("Bạn không có quyền từ chối đơn này.");

            request.Status = LeaveStatus.Rejected;
            request.ApproverId = approverId;
            request.ApproverNote = note;
            request.ApprovedAt = DateTime.UtcNow;
            request.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Create notification for employee
            await _notificationService.CreateNotificationAsync(new HRMS.Application.DTOs.Notification.CreateNotificationDto
            {
                EmployeeId = request.EmployeeId,
                Title = "Đơn nghỉ phép của bạn bị TỪ CHỐI",
                Message = $"Đơn nghỉ phép từ ngày {request.FromDate:dd/MM/yyyy} đến {request.ToDate:dd/MM/yyyy} của bạn đã bị từ chối. Lý do: {note}",
                Type = "Leave",
                RelatedId = request.Id.ToString()
            });

            return true;
        }

        // ===== HELPERS =====

        private async Task<double> CalculateWorkingDaysAsync(int employeeId, DateTime from, DateTime to)
        {
            var fromDate = from.Date;
            var toDate = to.Date;

            // Get schedules for this range to see actual working shifts
            var schedules = await _context.WorkSchedules
                .Where(s => s.EmployeeId == employeeId && s.WorkingDate >= fromDate && s.WorkingDate <= toDate)
                .ToListAsync();

            double count = 0;
            for (var d = fromDate; d <= toDate; d = d.AddDays(1))
            {
                var schedule = schedules.FirstOrDefault(s => s.WorkingDate.Date == d);
                if (schedule != null)
                {
                    // Count only if there is an assigned work shift
                    if (schedule.WorkShiftId != null)
                        count++;
                }
                else
                {
                    // Fallback to standard weekend logic if no schedule is found
                    // Only Sunday is a day off now
                    if (d.DayOfWeek != DayOfWeek.Sunday)
                        count++;
                }
            }
            return count;
        }

        private static LeaveRequestDto MapToDto(LeaveRequest lr) => new LeaveRequestDto
        {
            Id = lr.Id,
            EmployeeId = lr.EmployeeId,
            EmployeeName = lr.Employee?.FullName ?? "",
            EmployeePositionName = lr.Employee?.Position?.PositionName,
            EmployeeDepartmentId = lr.Employee?.DepartmentId,
            EmployeeDepartmentName = lr.Employee?.Department?.DepartmentName,
            LeaveTypeId = lr.LeaveTypeId,
            LeaveTypeName = lr.LeaveType?.Name ?? "",
            IsPaid = lr.LeaveType?.IsPaid ?? false,
            FromDate = lr.FromDate,
            ToDate = lr.ToDate,
            TotalDays = lr.TotalDays,
            Reason = lr.Reason,
            Status = lr.Status,
            ApproverNote = lr.ApproverNote,
            ApproverName = lr.Approver?.FullName,
            ApprovedAt = lr.ApprovedAt,
            CreatedAt = lr.CreatedAt
        };
    }
}
