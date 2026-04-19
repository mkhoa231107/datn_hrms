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

namespace HRMS.Infrastructure.Services
{
    public class LeaveService : ILeaveService
    {
        private readonly HRMSDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly Microsoft.AspNetCore.Hosting.IWebHostEnvironment _env;

        public LeaveService(HRMSDbContext context, INotificationService notificationService, Microsoft.AspNetCore.Hosting.IWebHostEnvironment env)
        {
            _context = context;
            _notificationService = notificationService;
            _env = env;
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

            // 5. Lead Time & Backdating Validations
            var now = DateTime.UtcNow;
            var fromDateLocal = dto.FromDate.Date;
            var requestLeadTime = fromDateLocal - now.Date;

            var leaveType = await _context.LeaveTypes.FindAsync(dto.LeaveTypeId);
            bool isSickLeave = leaveType?.Code == "SICK";

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

                    if (totalDays <= 3)
                    {
                        // Notify Department Heads of the same department
                        var headRoleId = (await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == "DepartmentHead"))?.Id;
                        if (headRoleId != null)
                        {
                            approverEmployeeIds = await _context.UserRoles
                                .Where(ur => ur.RoleId == headRoleId)
                                .Join(_context.Employees, ur => ur.UserId, e => e.UserId, (ur, e) => e)
                                .Where(e => e.DepartmentId == employee.DepartmentId)
                                .Select(e => e.Id)
                                .ToListAsync();
                        }
                    }
                    else
                    {
                        // Notify Department Manager
                        // Option 1: ManagerId of the department
                        if (employee.Department?.ManagerId != null)
                        {
                            approverEmployeeIds.Add(employee.Department.ManagerId.Value);
                        }
                        
                        // Option 2: Anyone with DepartmentManager role in the team hierarchy (fallback/redundancy)
                        var managerRoleId = (await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == "DepartmentManager"))?.Id;
                        if (managerRoleId != null && !approverEmployeeIds.Any())
                        {
                            approverEmployeeIds.AddRange(await _context.UserRoles
                                .Where(ur => ur.RoleId == managerRoleId)
                                .Join(_context.Employees, ur => ur.UserId, e => e.UserId, (ur, e) => e)
                                .Where(e => e.DepartmentId == employee.DepartmentId || e.Id == employee.Department.ManagerId)
                                .Select(e => e.Id)
                                .ToListAsync());
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
                        // ONLY a Head (not a Manager): sees <= 3 days AND NOT from other Heads in their team
                        query = query.Where(lr => lr.TotalDays <= 3 && 
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
                            // OR Requests > 3 days from others
                            (lr.TotalDays > 3)
                        ));
                    }
                }
                else return Enumerable.Empty<LeaveRequestDto>();
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
                
                // Requirement check for Head: Same department, NOT another Head, and Short-term (< 3 days)
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

                if (balance != null)
                {
                    balance.UsedDays += request.TotalDays;
                    balance.UpdatedAt = DateTime.UtcNow;
                }

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
                    // Fallback to HolidayHelper (Excludes Sunday + Public Holidays)
                    if (HolidayHelper.IsWorkingDay(d))
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
