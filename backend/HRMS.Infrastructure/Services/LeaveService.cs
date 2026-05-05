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
using HRMS.Infrastructure.Helpers;
using Microsoft.AspNetCore.SignalR;

namespace HRMS.Infrastructure.Services
{
    public class LeaveService : ILeaveService
    {
        private readonly HRMSDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly Microsoft.AspNetCore.Hosting.IWebHostEnvironment _env;
        private readonly IHubContext<HrmsHubProxy> _hubContext;

        public LeaveService(HRMSDbContext context, INotificationService notificationService, Microsoft.AspNetCore.Hosting.IWebHostEnvironment env, IHubContext<HrmsHubProxy> hubContext)
        {
            _context = context;
            _notificationService = notificationService;
            _env = env;
            _hubContext = hubContext;
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
            var balances = await _context.LeaveBalances
                .Where(lb => lb.EmployeeId == employeeId && lb.Year == year)
                .Include(lb => lb.LeaveType)
                .ToListAsync();

            if (!balances.Any())
            {
                Console.WriteLine($"[LEAVE] Auto-seeding balances for Employee {employeeId} in year {year}");
                var leaveTypes = await _context.LeaveTypes.Where(lt => lt.IsActive).ToListAsync();
                if (leaveTypes.Any())
                {
                    foreach (var lt in leaveTypes)
                    {
                        _context.LeaveBalances.Add(new LeaveBalance
                        {
                            EmployeeId = employeeId,
                            LeaveTypeId = lt.Id,
                            Year = year,
                            TotalDays = lt.DefaultDaysPerYear,
                            UsedDays = 0,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                    await _context.SaveChangesAsync();
                    
                    // Re-query to get includes
                    balances = await _context.LeaveBalances
                        .Where(lb => lb.EmployeeId == employeeId && lb.Year == year)
                        .Include(lb => lb.LeaveType)
                        .ToListAsync();
                }
            }

            return balances.Select(lb => new LeaveBalanceDto
            {
                LeaveTypeId = lb.LeaveTypeId,
                LeaveTypeName = lb.LeaveType?.Name ?? "N/A",
                IsPaid = lb.LeaveType?.IsPaid ?? false,
                Year = lb.Year,
                TotalDays = lb.TotalDays,
                UsedDays = lb.UsedDays,
                RemainingDays = lb.TotalDays - lb.UsedDays
            }).ToList();
        }

        public async Task<IEnumerable<LeaveRequestDto>> GetMyRequestsAsync(int employeeId)
        {
            return await _context.LeaveRequests
                .Where(lr => lr.EmployeeId == employeeId)
                .Include(lr => lr.LeaveType)
                .Include(lr => lr.Approver)
                .OrderByDescending(lr => lr.CreatedAt)
                .Select(lr => new LeaveRequestDto
                {
                    Id = lr.Id,
                    EmployeeId = lr.EmployeeId,
                    EmployeeName = lr.Employee.FullName,
                    EmployeeCode = lr.Employee.EmployeeCode,
                    EmployeePositionName = lr.Employee.Position.PositionName,
                    EmployeeDepartmentId = lr.Employee.DepartmentId,
                    EmployeeDepartmentName = lr.Employee.Department.DepartmentName,
                    LeaveTypeId = lr.LeaveTypeId,
                    LeaveTypeName = lr.LeaveType.Name,
                    IsPaid = lr.LeaveType.IsPaid,
                    FromDate = lr.FromDate,
                    ToDate = lr.ToDate,
                    TotalDays = lr.TotalDays,
                    Reason = lr.Reason,
                    Phone = lr.Phone,
                    Address = lr.Address,
                    JobTitle = lr.JobTitle,
                    RequesterSignature = lr.RequesterSignature,
                    ApproverSignature = lr.ApproverSignature,
                    Status = lr.Status,
                    ApproverNote = lr.ApproverNote,
                    ApproverName = lr.Approver.FullName,
                    AttachmentUrl = lr.AttachmentUrl,
                    ApprovedAt = lr.ApprovedAt,
                    CreatedAt = lr.CreatedAt
                })
                .ToListAsync();
        }

        public async Task<LeaveRequestDto> CreateRequestAsync(int employeeId, LeaveRequestCreateDto dto)
        {
            // 0. Basic Validations
            if (dto.LeaveTypeId <= 0)
                throw new InvalidOperationException("Vui lòng chọn loại nghỉ phép.");
            if (string.IsNullOrWhiteSpace(dto.Reason))
                throw new InvalidOperationException("Vui lòng nhập lý do nghỉ phép.");
            if (string.IsNullOrWhiteSpace(dto.Phone))
                throw new InvalidOperationException("Vui lòng nhập số điện thoại liên hệ khi nghỉ.");

            var leaveType = await _context.LeaveTypes.FindAsync(dto.LeaveTypeId);
            if (leaveType == null || !leaveType.IsActive)
                throw new InvalidOperationException("Loại nghỉ phép không hợp lệ hoặc đã bị vô hiệu hóa.");

            bool isSickLeave = leaveType.Code == "SICK";

            // 1. Validate date range
            if (dto.ToDate.Date < dto.FromDate.Date)
                throw new InvalidOperationException("Ngày kết thúc không thể trước ngày bắt đầu.");

            // 2. Calculate working days based on schedule (with fallback)
            double totalDays = await CalculateWorkingDaysAsync(employeeId, dto.FromDate, dto.ToDate);
            if (totalDays <= 0)
                throw new InvalidOperationException("Không có ngày làm việc trong khoảng thời gian đã chọn (có thể trùng ngày nghỉ lễ/cuối tuần).");

            if (totalDays > 30)
                throw new InvalidOperationException("Một đơn nghỉ phép không được vượt quá 30 ngày làm việc.");

            // 3. Check for overlapping requests
            bool overlap = await _context.LeaveRequests.AnyAsync(lr =>
                lr.EmployeeId == employeeId &&
                lr.Status != LeaveStatus.Rejected &&
                lr.Status != LeaveStatus.Cancelled &&
                lr.FromDate.Date <= dto.ToDate.Date &&
                lr.ToDate.Date >= dto.FromDate.Date);

            if (overlap)
                throw new InvalidOperationException("Đã có đơn nghỉ phép khác trùng lặp thời gian này.");

            // 3.5 Sick Leave specific rules
            if (isSickLeave && totalDays >= 3 && string.IsNullOrWhiteSpace(dto.AttachmentBase64))
                throw new InvalidOperationException("Nghỉ ốm từ 3 ngày trở lên yêu cầu phải đính kèm giấy xác nhận của bác sĩ/bệnh viện.");

            // 4. Check leave balance
            int year = dto.FromDate.Year;
            var balance = await _context.LeaveBalances
                .FirstOrDefaultAsync(lb => lb.EmployeeId == employeeId
                    && lb.LeaveTypeId == dto.LeaveTypeId
                    && lb.Year == year);

            if (balance == null)
            {
                Console.WriteLine($"[LEAVE] Auto-seeding balances for Employee {employeeId} during request creation");
                var leaveTypes = await _context.LeaveTypes.Where(lt => lt.IsActive).ToListAsync();
                foreach (var lt in leaveTypes)
                {
                    var nb = new LeaveBalance
                    {
                        EmployeeId = employeeId,
                        LeaveTypeId = lt.Id,
                        Year = year,
                        TotalDays = lt.DefaultDaysPerYear,
                        UsedDays = 0,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.LeaveBalances.Add(nb);
                    if (lt.Id == dto.LeaveTypeId) balance = nb;
                }
                await _context.SaveChangesAsync();
            }

            if (balance == null)
                throw new InvalidOperationException($"Bạn chưa có số dư nghỉ phép cho loại '{leaveType.Name}' trong năm {year}.");

            double remaining = balance.TotalDays - balance.UsedDays;
            if (totalDays > remaining)
                throw new InvalidOperationException($"Số ngày nghỉ yêu cầu ({totalDays}) vượt quá số ngày còn lại ({remaining}).");

            // 5. Lead Time & Backdating Validations
            var now = DateTime.UtcNow;
            var fromDateLocal = dto.FromDate.Date;
            var requestLeadTime = fromDateLocal - now.Date;

            // 5.1 No Backdating (except SICK)
            if (!isSickLeave && fromDateLocal < now.Date)
            {
                throw new InvalidOperationException("Không thể tạo đơn nghỉ phép lùi về quá khứ (trừ trường hợp nghỉ ốm).");
            }

            // 5.2 Lead Time Validation
            if (!isSickLeave)
            {
                if (totalDays < 3)
                {
                    // Require 24h notice (1 day)
                    if (requestLeadTime.TotalDays < 1)
                        throw new InvalidOperationException("Đơn nghỉ dưới 3 ngày phải báo trước ít nhất 24 giờ.");
                }
                else
                {
                    // Require 1 week notice (7 days)
                    if (requestLeadTime.TotalDays < 7)
                        throw new InvalidOperationException("Đơn nghỉ từ 3 ngày trở lên phải báo trước ít nhất 1 tuần.");
                }
            }

            // 6. Process Attachment (Base64 to File)
            string? attachmentUrl = null;
            if (!string.IsNullOrEmpty(dto.AttachmentBase64))
            {
                try
                {
                    string uploadsFolder = System.IO.Path.Combine(_env.WebRootPath ?? System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "leave");
                    if (!System.IO.Directory.Exists(uploadsFolder))
                        System.IO.Directory.CreateDirectory(uploadsFolder);

                    string fileName = Guid.NewGuid().ToString() + ".png"; // Default to png for simplicity, can be improved
                    string filePath = System.IO.Path.Combine(uploadsFolder, fileName);

                    // Extract base64 content
                    string base64Content = dto.AttachmentBase64;
                    if (base64Content.Contains(","))
                        base64Content = base64Content.Split(',')[1];

                    byte[] fileBytes = Convert.FromBase64String(base64Content);
                    await System.IO.File.WriteAllBytesAsync(filePath, fileBytes);

                    attachmentUrl = $"/uploads/leave/{fileName}";
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error saving leave attachment: {ex.Message}");
                }
            }

            // 7. Create request
            var request = new LeaveRequest
            {
                EmployeeId = employeeId,
                LeaveTypeId = dto.LeaveTypeId,
                FromDate = dto.FromDate,
                ToDate = dto.ToDate,
                TotalDays = totalDays,
                Reason = dto.Reason,
                Phone = dto.Phone,
                Address = dto.Address,
                RequesterSignature = dto.RequesterSignature,
                AttachmentUrl = attachmentUrl,
                JobTitle = (await _context.Employees.Include(e => e.Position).FirstOrDefaultAsync(e => e.Id == employeeId))?.Position?.PositionName ?? "N/A",
                Status = LeaveStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };

            _context.LeaveRequests.Add(request);
            await _context.SaveChangesAsync();

            // 7. Notify Approver(s)
            try
            {
                var employee = await _context.Employees.Include(e => e.Department).FirstOrDefaultAsync(e => e.Id == employeeId);
                if (employee != null)
                {
                    List<int> approverEmployeeIds = new List<int>();

                    // Roles of the requester to decide notification target
                    var headRoleId = (await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == "DepartmentHead"))?.Id;
                    var isRequesterHead = _context.UserRoles.Any(ur => ur.UserId == employee.UserId && ur.RoleId == headRoleId);

                    if (totalDays <= 3 && !isRequesterHead)
                    {
                        // Notify Department Heads of the same department (excluding self)
                        if (headRoleId != null)
                        {
                            approverEmployeeIds = await _context.UserRoles
                                .Where(ur => ur.RoleId == headRoleId)
                                .Join(_context.Employees, ur => ur.UserId, e => e.UserId, (ur, e) => e)
                                .Where(e => e.DepartmentId == employee.DepartmentId && e.Id != employeeId)
                                .Select(e => e.Id)
                                .ToListAsync();
                        }
                    }
                    
                    // If no head found OR is a head themselves OR is > 3 days -> notify Manager
                    if (!approverEmployeeIds.Any() || totalDays > 3 || isRequesterHead)
                    {
                        // Notify Department Manager
                        if (employee.Department?.ManagerId != null && employee.Department.ManagerId != employeeId)
                        {
                            approverEmployeeIds.Add(employee.Department.ManagerId.Value);
                        }
                        
                        // Fallback: anyone with DepartmentManager role in the dept
                        var managerRoleId = (await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == "DepartmentManager"))?.Id;
                        if (managerRoleId != null)
                        {
                            var mgrs = await _context.UserRoles
                                .Where(ur => ur.RoleId == managerRoleId)
                                .Join(_context.Employees, ur => ur.UserId, e => e.UserId, (ur, e) => e)
                                .Where(e => (e.DepartmentId == employee.DepartmentId || e.Id == (employee.Department != null ? employee.Department.ManagerId : null)) && e.Id != employeeId)
                                .Select(e => e.Id)
                                .ToListAsync();
                            approverEmployeeIds.AddRange(mgrs);
                        }
                    }

                    foreach (var approverEmpId in approverEmployeeIds.Distinct())
                    {
                        await _notificationService.CreateNotificationAsync(new HRMS.Application.DTOs.Notification.CreateNotificationDto
                        {
                            EmployeeId = approverEmpId,
                            Title = "Đơn nghỉ phép mới đang chờ duyệt",
                            Message = $"Nhân viên {employee.FullName} đã gửi đơn nghỉ phép {totalDays} ngày từ {dto.FromDate:dd/MM} đến {dto.ToDate:dd/MM}.",
                            Type = "Leave",
                            RelatedId = request.Id.ToString()
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                // Non-blocking error for notifications
                Console.WriteLine($"Error sending approver notification: {ex.Message}");
            }

            // ⚡ Real-time trigger for managers to refresh their dashboard
            await _hubContext.Clients.Group("managers").SendAsync("DashboardRefresh");

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
                    int deptIdStr = 0;
                    
                    if (!int.TryParse(deptIdString, out deptIdStr) || deptIdStr <= 0)
                    {
                        // Fallback: lookup the manager's own department if claim is missing
                        var approver = await _context.Employees.FindAsync(approverId);
                        deptIdStr = approver?.DepartmentId ?? 0;
                    }

                    if (deptIdStr <= 0) return Enumerable.Empty<LeaveRequestDto>();

                    // Get all managed department IDs (including children)
                    List<int> deptIds = new List<int> { deptIdStr };
                    if (isManager)
                    {
                        var children = await _context.Departments
                            .Where(d => d.ParentDepartmentId == deptIdStr)
                            .Select(d => d.Id)
                            .ToListAsync();
                        deptIds.AddRange(children);
                        
                        // Check one more level for deep structures
                        var grandChildren = await _context.Departments
                            .Where(d => d.ParentDepartmentId != null && children.Contains(d.ParentDepartmentId.Value))
                            .Select(d => d.Id)
                            .ToListAsync();
                        deptIds.AddRange(grandChildren);
                    }
                    
                    deptIds = deptIds.Distinct().ToList();

                    // Roles for filtering logic
                    bool isAnyManager = isManager;
                    bool isOnlyHead = isHead && !isManager;

                    if (isOnlyHead)
                    {
                        // ONLY a Head: sees <= 3 days AND NOT from other Heads
                        query = query.Where(lr => lr.TotalDays <= 3 && 
                                            !_context.UserRoles.Any(ur => ur.UserId == lr.Employee.UserId && ur.Role.RoleName == "DepartmentHead"));
                        
                        // Only same department
                        query = query.Where(lr => lr.Employee.DepartmentId == deptIdStr);
                    }
                    else if (isAnyManager)
                    {
                        // A Manager (Trưởng phòng) sees:
                        // 1. All requests from DepartmentHeads in their domain (regardless of days)
                        // 2. Requests > 3 days from regular employees in their domain
                        
                        var headRole = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == "DepartmentHead");
                        int headRoleId = headRole?.Id ?? -1;

                        query = query.Where(lr => deptIds.Contains(lr.Employee.DepartmentId) && (
                            // All requests from Heads (Managers are their direct superiors)
                            _context.UserRoles.Any(ur => ur.UserId == lr.Employee.UserId && ur.RoleId == headRoleId) ||
                            // OR Requests > 3 days from others
                            (lr.TotalDays > 3)
                        ));
                }
            }
            else
            {
                return Enumerable.Empty<LeaveRequestDto>();
            }

            return await query
                .OrderByDescending(lr => lr.CreatedAt)
                .Select(lr => new LeaveRequestDto
                {
                    Id = lr.Id,
                    EmployeeId = lr.EmployeeId,
                    EmployeeName = lr.Employee.FullName,
                    EmployeeCode = lr.Employee.EmployeeCode,
                    EmployeePositionName = lr.Employee.Position.PositionName,
                    EmployeeDepartmentId = lr.Employee.DepartmentId,
                    EmployeeDepartmentName = lr.Employee.Department.DepartmentName,
                    LeaveTypeId = lr.LeaveTypeId,
                    LeaveTypeName = lr.LeaveType.Name,
                    IsPaid = lr.LeaveType.IsPaid,
                    FromDate = lr.FromDate,
                    ToDate = lr.ToDate,
                    TotalDays = lr.TotalDays,
                    Reason = lr.Reason,
                    Phone = lr.Phone,
                    Address = lr.Address,
                    JobTitle = lr.JobTitle,
                    RequesterSignature = lr.RequesterSignature,
                    ApproverSignature = lr.ApproverSignature,
                    Status = lr.Status,
                    ApproverNote = lr.ApproverNote,
                    ApproverName = lr.Approver.FullName,
                    AttachmentUrl = lr.AttachmentUrl,
                    ApprovedAt = lr.ApprovedAt,
                    CreatedAt = lr.CreatedAt
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<LeaveRequestDto>> GetApprovalHistoryAsync(int approverId)
        {
            return await _context.LeaveRequests
                .Where(lr => lr.ApproverId == approverId && lr.Status != LeaveStatus.Pending)
                .Include(lr => lr.LeaveType)
                .Include(lr => lr.Employee)
                .OrderByDescending(lr => lr.ApprovedAt)
                .Select(lr => new LeaveRequestDto
                {
                    Id = lr.Id,
                    EmployeeId = lr.EmployeeId,
                    EmployeeName = lr.Employee.FullName,
                    EmployeeCode = lr.Employee.EmployeeCode,
                    EmployeePositionName = lr.Employee.Position.PositionName,
                    EmployeeDepartmentId = lr.Employee.DepartmentId,
                    EmployeeDepartmentName = lr.Employee.Department.DepartmentName,
                    LeaveTypeId = lr.LeaveTypeId,
                    LeaveTypeName = lr.LeaveType.Name,
                    IsPaid = lr.LeaveType.IsPaid,
                    FromDate = lr.FromDate,
                    ToDate = lr.ToDate,
                    TotalDays = lr.TotalDays,
                    Reason = lr.Reason,
                    Phone = lr.Phone,
                    Address = lr.Address,
                    JobTitle = lr.JobTitle,
                    RequesterSignature = lr.RequesterSignature,
                    ApproverSignature = lr.ApproverSignature,
                    Status = lr.Status,
                    ApproverNote = lr.ApproverNote,
                    ApproverName = lr.Approver.FullName,
                    AttachmentUrl = lr.AttachmentUrl,
                    ApprovedAt = lr.ApprovedAt,
                    CreatedAt = lr.CreatedAt
                })
                .ToListAsync();
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

                if (isUnderManager && (request.TotalDays > 3 || isRequesterHead)) return true;
            }

            if (user.IsInRole("DepartmentHead"))
            {
                var deptId = int.Parse(user.FindFirst("DepartmentId")?.Value ?? "0");
                
                // Head: Same department, NOT another Head, and <= 3 days
                var isRequesterHead = _context.UserRoles
                    .Include(ur => ur.Role)
                    .Any(ur => ur.UserId == request.Employee.UserId && ur.Role.RoleName == "DepartmentHead");

                if (request.Employee.DepartmentId == deptId && !isRequesterHead && request.TotalDays <= 3) return true;
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
                request.ApproverSignature = user.FindFirst("ApproverSignature")?.Value ?? (note?.Contains("SIGN:") == true ? note.Substring(note.IndexOf("SIGN:") + 5) : null); // Fallback logic if signature passed in note or claim
                request.ApprovedAt = DateTime.UtcNow;
                request.UpdatedAt = DateTime.UtcNow;

                int year = request.FromDate.Year;
                var balance = await _context.LeaveBalances
                    .FirstOrDefaultAsync(lb => lb.EmployeeId == request.EmployeeId
                        && lb.LeaveTypeId == request.LeaveTypeId
                        && lb.Year == year);

                if (balance == null)
                {
                    // Auto-init balance if it was somehow skipped
                    var leaveType = await _context.LeaveTypes.FindAsync(request.LeaveTypeId);
                    balance = new LeaveBalance
                    {
                        EmployeeId = request.EmployeeId,
                        LeaveTypeId = request.LeaveTypeId,
                        Year = year,
                        TotalDays = leaveType?.DefaultDaysPerYear ?? 12,
                        UsedDays = 0,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.LeaveBalances.Add(balance);
                }

                balance.UsedDays += request.TotalDays;
                balance.UpdatedAt = DateTime.UtcNow;

                // Update work schedule to reflect leave
                var schedulesToUpdate = await _context.WorkSchedules
                    .Where(ws => ws.EmployeeId == request.EmployeeId 
                              && ws.WorkingDate.Date >= request.FromDate.Date 
                              && ws.WorkingDate.Date <= request.ToDate.Date)
                    .ToListAsync();
                
                foreach (var schedule in schedulesToUpdate)
                {
                    schedule.WorkShiftId = null;
                    schedule.Note = "Nghỉ phép";
                    schedule.UpdatedAt = DateTime.UtcNow;

                    // Also update AttendanceDetail to prevent negative marks
                    var attendance = await _context.AttendanceDetails
                        .FirstOrDefaultAsync(ad => ad.EmployeeId == request.EmployeeId && ad.Date.Date == schedule.WorkingDate.Date);
                    
                    if (attendance == null)
                    {
                        attendance = new AttendanceDetail
                        {
                            EmployeeId = request.EmployeeId,
                            Date = schedule.WorkingDate.Date,
                            Status = "Nghỉ phép",
                            Note = request.LeaveType?.Name ?? "Nghỉ phép (Có đơn)",
                            WorkingDays = request.LeaveType?.IsPaid == true ? 1.0m : 0m,
                            CreatedAt = DateTime.UtcNow
                        };
                        _context.AttendanceDetails.Add(attendance);
                    }
                    else if (attendance.Status == "Vắng mặt" || string.IsNullOrEmpty(attendance.Status))
                    {
                        attendance.Status = "Nghỉ phép";
                        attendance.Note = request.LeaveType?.Name ?? "Nghỉ phép (Có đơn)";
                        attendance.WorkingDays = request.LeaveType?.IsPaid == true ? 1.0m : 0m;
                        attendance.UpdatedAt = DateTime.UtcNow;
                    }
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

                // ⚡ Real-time notify employee
                await _hubContext.Clients.Group($"employee_{request.EmployeeId}").SendAsync("LeaveStatusUpdated", new { id = request.Id, status = "Approved" });
                // ⚡ Real-time trigger for managers to refresh dashboard stats
                await _hubContext.Clients.Group("managers").SendAsync("DashboardRefresh");

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

            // ⚡ Real-time notify employee
            await _hubContext.Clients.Group($"employee_{request.EmployeeId}").SendAsync("LeaveStatusUpdated", new { id = request.Id, status = "Rejected" });
            // ⚡ Real-time trigger for managers to refresh dashboard stats
            await _hubContext.Clients.Group("managers").SendAsync("DashboardRefresh");

            return true;
        }

        // ===== HELPERS =====

        private async Task<double> CalculateWorkingDaysAsync(int employeeId, DateTime from, DateTime to)
        {
            var fromDate = from.Date;
            var toDate = to.Date;

            // Get schedules for this range to see actual working shifts
            var schedules = await _context.WorkSchedules
                .Where(s => s.EmployeeId == employeeId && s.WorkingDate.Date >= fromDate && s.WorkingDate.Date <= toDate)
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
                    // Fallback to HolidayHelper (Excludes Sunday + Public Holidays)
                    if (HolidayHelper.IsWorkingDay(d))
                        count++;
                }
            }
            return count;
        }

        public async Task<byte[]> ExportLeaveToExcelAsync(int? departmentId, int? year)
        {
            var targetYear = year ?? DateTime.Now.Year;
            var query = _context.LeaveRequests
                .Include(lr => lr.Employee).ThenInclude(e => e.Department)
                .Include(lr => lr.LeaveType)
                .Where(lr => lr.FromDate.Year == targetYear);

            if (departmentId.HasValue && departmentId > 0)
            {
                query = query.Where(lr => lr.Employee.DepartmentId == departmentId);
            }

            var data = await query.OrderByDescending(lr => lr.CreatedAt).ToListAsync();

            using (var workbook = new ClosedXML.Excel.XLWorkbook())
            {
                var worksheet = workbook.Worksheets.Add("Danh sách nghỉ phép");

                // Headers
                worksheet.Cell(1, 1).Value = "STT";
                worksheet.Cell(1, 2).Value = "Mã NV";
                worksheet.Cell(1, 3).Value = "Họ tên";
                worksheet.Cell(1, 4).Value = "Phòng ban";
                worksheet.Cell(1, 5).Value = "Loại nghỉ";
                worksheet.Cell(1, 6).Value = "Từ ngày";
                worksheet.Cell(1, 7).Value = "Đến ngày";
                worksheet.Cell(1, 8).Value = "Số ngày";
                worksheet.Cell(1, 9).Value = "Lý do";
                worksheet.Cell(1, 10).Value = "Trạng thái";

                // Styling header
                var headerRange = worksheet.Range(1, 1, 1, 10);
                headerRange.Style.Font.Bold = true;
                headerRange.Style.Fill.BackgroundColor = ClosedXML.Excel.XLColor.LightGray;
                headerRange.Style.Alignment.Horizontal = ClosedXML.Excel.XLAlignmentHorizontalValues.Center;

                for (int i = 0; i < data.Count; i++)
                {
                    var item = data[i];
                    int row = i + 2;
                    worksheet.Cell(row, 1).Value = i + 1;
                    worksheet.Cell(row, 2).Value = item.Employee.EmployeeCode;
                    worksheet.Cell(row, 3).Value = item.Employee.FullName;
                    worksheet.Cell(row, 4).Value = item.Employee.Department?.DepartmentName;
                    worksheet.Cell(row, 5).Value = item.LeaveType.Name;
                    worksheet.Cell(row, 6).Value = item.FromDate.ToString("dd/MM/yyyy");
                    worksheet.Cell(row, 7).Value = item.ToDate.ToString("dd/MM/yyyy");
                    worksheet.Cell(row, 8).Value = item.TotalDays;
                    worksheet.Cell(row, 9).Value = item.Reason;
                    worksheet.Cell(row, 10).Value = item.Status.ToString();
                }

                worksheet.Columns().AdjustToContents();

                using (var stream = new System.IO.MemoryStream())
                {
                    workbook.SaveAs(stream);
                    return stream.ToArray();
                }
            }
        }

        private static LeaveRequestDto MapToDto(LeaveRequest lr) => new LeaveRequestDto
        {
            Id = lr.Id,
            EmployeeId = lr.EmployeeId,
            EmployeeName = lr.Employee?.FullName ?? "",
            EmployeeCode = lr.Employee?.EmployeeCode,
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
            Phone = lr.Phone,
            Address = lr.Address,
            JobTitle = lr.JobTitle,
            RequesterSignature = lr.RequesterSignature,
            ApproverSignature = lr.ApproverSignature,
            Status = lr.Status,
            ApproverNote = lr.ApproverNote,
            ApproverName = lr.Approver?.FullName,
            AttachmentUrl = lr.AttachmentUrl,
            ApprovedAt = lr.ApprovedAt,
            CreatedAt = lr.CreatedAt
        };
    }
}
