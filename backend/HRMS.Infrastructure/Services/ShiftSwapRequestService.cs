using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using HRMS.Application.DTOs.ShiftSwap;
using HRMS.Application.Interfaces;
using HRMS.Domain.Entities;
using HRMS.Domain.Enums;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Element;
using iText.IO.Image;
using System.IO;

namespace HRMS.Infrastructure.Services
{
    public class ShiftSwapRequestService : IShiftSwapRequestService
    {
        private readonly HRMSDbContext _context;
        private readonly INotificationService _notificationService;

        public ShiftSwapRequestService(HRMSDbContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        // Helper: map entity sang DTO an toàn (không circular)
        private static ShiftSwapRequestDto MapToDto(ShiftSwapRequest r) => new ShiftSwapRequestDto
        {
            Id = r.Id,
            EmployeeAId = r.EmployeeAId,
            EmployeeBId = r.EmployeeBId,
            ManagerId = r.ManagerId,
            HRId = r.HRId,
            EmployeeA = r.EmployeeA == null ? null : new EmployeeSwapDto
            {
                Id = r.EmployeeA.Id,
                EmployeeCode = r.EmployeeA.EmployeeCode,
                FullName = r.EmployeeA.FullName,
                Department = r.EmployeeA.Department == null ? null : new DepartmentSwapDto
                {
                    Id = r.EmployeeA.Department.Id,
                    DepartmentName = r.EmployeeA.Department.DepartmentName,
                    ManagerId = r.EmployeeA.Department.ManagerId
                }
            },
            EmployeeB = r.EmployeeB == null ? null : new EmployeeSwapDto
            {
                Id = r.EmployeeB.Id,
                EmployeeCode = r.EmployeeB.EmployeeCode,
                FullName = r.EmployeeB.FullName,
                Department = r.EmployeeB.Department == null ? null : new DepartmentSwapDto
                {
                    Id = r.EmployeeB.Department.Id,
                    DepartmentName = r.EmployeeB.Department.DepartmentName,
                    ManagerId = r.EmployeeB.Department.ManagerId
                }
            },
            Manager = r.Manager == null ? null : new EmployeeSwapDto
            {
                Id = r.Manager.Id,
                EmployeeCode = r.Manager.EmployeeCode,
                FullName = r.Manager.FullName
            },
            HR = r.HR == null ? null : new EmployeeSwapDto
            {
                Id = r.HR.Id,
                EmployeeCode = r.HR.EmployeeCode,
                FullName = r.HR.FullName
            },
            StartDate = r.StartDate,
            EndDate = r.EndDate,
            TargetShiftId = r.TargetShiftId,
            Reason = r.Reason,
            PhoneNumber = r.PhoneNumber,
            Address = r.Address,
            Status = r.Status.ToString(),
            SignatureA = r.SignatureA,
            SignedAtA = r.SignedAtA,
            SignatureB = r.SignatureB,
            SignedAtB = r.SignedAtB,
            SignatureManager = r.SignatureManager,
            SignedAtManager = r.SignedAtManager,
            SignatureHR = r.SignatureHR,
            SignedAtHR = r.SignedAtHR,
            RejectReason = r.RejectReason,
            CreatedAt = r.CreatedAt
        };

        public async Task<ShiftSwapRequestDto?> GetByIdAsync(int id)
        {
            var r = await _context.ShiftSwapRequests
                .Include(x => x.EmployeeA).ThenInclude(e => e.Department)
                .Include(x => x.EmployeeB).ThenInclude(e => e.Department)
                .Include(x => x.Manager)
                .Include(x => x.HR)
                .FirstOrDefaultAsync(x => x.Id == id);
            return r == null ? null : MapToDto(r);
        }

        public async Task<IEnumerable<ShiftSwapRequest>> GetAllAsync()
        {
            return await _context.ShiftSwapRequests
                .Include(r => r.EmployeeA)
                .Include(r => r.EmployeeB)
                .ToListAsync();
        }

        public async Task<IEnumerable<ShiftSwapRequestDto>> GetByEmployeeIdAsync(int employeeId)
        {
            var list = await _context.ShiftSwapRequests
                .Where(r => r.EmployeeAId == employeeId || r.EmployeeBId == employeeId)
                .Include(r => r.EmployeeA).ThenInclude(e => e.Department)
                .Include(r => r.EmployeeB).ThenInclude(e => e.Department)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
            return list.Select(MapToDto);
        }

        public async Task<IEnumerable<ShiftSwapRequestDto>> GetPendingApprovalsAsync(int approverId, List<string> roles)
        {
            var resultList = new List<ShiftSwapRequest>();

            // DepartmentHead: Trưởng bộ phận xem đơn đổi ca của nhân viên trong phòng ban mình quản lý
            // Logic: tìm department mà approverId là ManagerId của dept đó
            if (roles.Contains("DepartmentHead") || roles.Contains("DepartmentManager"))
            {
                // Tìm tất cả departments mà người này là Manager
                var managedDeptIds = await _context.Departments
                    .Where(d => d.ManagerId == approverId && d.IsActive)
                    .Select(d => d.Id)
                    .ToListAsync();

                // Nếu không tìm thấy qua ManagerId, fallback: lấy department của chính approver
                if (!managedDeptIds.Any())
                {
                    var approverDeptId = await _context.Employees
                        .Where(e => e.Id == approverId)
                        .Select(e => (int?)e.DepartmentId)
                        .FirstOrDefaultAsync();
                    if (approverDeptId.HasValue && approverDeptId.Value > 0)
                        managedDeptIds = new List<int> { approverDeptId.Value };
                }

                if (managedDeptIds.Any())
                {
                    var deptRequests = await _context.ShiftSwapRequests
                        .Include(r => r.EmployeeA).ThenInclude(e => e.Department)
                        .Include(r => r.EmployeeB).ThenInclude(e => e.Department)
                        .Include(r => r.Manager)
                        .Include(r => r.HR)
                        .Where(r => r.Status == ShiftSwapRequestStatus.PendingManager
                            && managedDeptIds.Contains(r.EmployeeA.DepartmentId))
                        .ToListAsync();
                    resultList.AddRange(deptRequests);
                }
            }

            // HR role: xem đơn đang chờ xác nhận HR
            bool isHR = roles.Contains("HR") || roles.Contains("Admin") || roles.Contains("CnbSpecialist");
            if (!isHR)
            {
                var approverDeptId = await _context.Employees
                    .Where(e => e.Id == approverId)
                    .Select(e => e.DepartmentId)
                    .FirstOrDefaultAsync();
                // IDs: 3 (Hành chính - Nhân sự), 6 (Tuyển dụng), 7 (Lương thưởng)
                if (approverDeptId == 3 || approverDeptId == 6 || approverDeptId == 7)
                {
                    isHR = true;
                }
            }

            if (isHR)
            {
                var hrRequests = await _context.ShiftSwapRequests
                    .Include(r => r.EmployeeA).ThenInclude(e => e.Department)
                    .Include(r => r.EmployeeB).ThenInclude(e => e.Department)
                    .Include(r => r.Manager)
                    .Include(r => r.HR)
                    .Where(r => r.Status == ShiftSwapRequestStatus.PendingHR)
                    .ToListAsync();
                // Tránh duplicate nếu user có cả 2 roles
                foreach (var req in hrRequests)
                    if (!resultList.Any(x => x.Id == req.Id))
                        resultList.Add(req);
            }

            return resultList
                .OrderByDescending(r => r.CreatedAt)
                .Select(MapToDto);
        }

        public async Task<IEnumerable<ShiftSwapRequestDto>> GetApprovalHistoryAsync(int approverId, List<string> roles)
        {
            var resultList = new List<ShiftSwapRequest>();
            var isManager = roles.Contains("DepartmentHead") || roles.Contains("DepartmentManager");
            
            // Check if HR
            var isHR = roles.Contains("Admin") || roles.Contains("HR") || roles.Contains("CnbSpecialist");
            if (!isHR)
            {
                var approverDeptId = await _context.Employees
                    .Where(e => e.Id == approverId)
                    .Select(e => e.DepartmentId)
                    .FirstOrDefaultAsync();
                if (approverDeptId == 3 || approverDeptId == 6 || approverDeptId == 7)
                {
                    isHR = true;
                }
            }

            if (isManager)
            {
                // Find departments this user manages
                var managedDeptIds = await _context.Departments
                    .Where(d => d.ManagerId == approverId)
                    .Select(d => d.Id)
                    .ToListAsync();
                    
                if (!managedDeptIds.Any())
                {
                    var myDeptId = await _context.Employees
                        .Where(e => e.Id == approverId)
                        .Select(e => e.DepartmentId)
                        .FirstOrDefaultAsync();
                    if (myDeptId != 0) managedDeptIds.Add(myDeptId);
                }

                if (managedDeptIds.Any())
                {
                    var managerRequests = await _context.ShiftSwapRequests
                        .Include(r => r.EmployeeA).ThenInclude(e => e.Department)
                        .Include(r => r.EmployeeB).ThenInclude(e => e.Department)
                        .Include(r => r.Manager)
                        .Include(r => r.HR)
                        .Where(r => (r.Status == ShiftSwapRequestStatus.Approved || r.Status == ShiftSwapRequestStatus.Rejected) 
                                    && r.EmployeeA != null && managedDeptIds.Contains(r.EmployeeA.DepartmentId))
                        .ToListAsync();
                    resultList.AddRange(managerRequests);
                }
            }

            if (isHR)
            {
                var hrRequests = await _context.ShiftSwapRequests
                    .Include(r => r.EmployeeA).ThenInclude(e => e.Department)
                    .Include(r => r.EmployeeB).ThenInclude(e => e.Department)
                    .Include(r => r.Manager)
                    .Include(r => r.HR)
                    .Where(r => r.Status == ShiftSwapRequestStatus.Approved || r.Status == ShiftSwapRequestStatus.Rejected)
                    .ToListAsync();
                foreach (var req in hrRequests)
                    if (!resultList.Any(x => x.Id == req.Id))
                        resultList.Add(req);
            }

            return resultList
                .OrderByDescending(r => r.CreatedAt)
                .Select(MapToDto);
        }

        public async Task<ShiftSwapRequest> CreateRequestAsync(int requesterId, ShiftSwapCreateDto dto)
        {
            // Validate Dept
            var requester = await _context.Employees.FindAsync(requesterId);
            var partner = await _context.Employees.FindAsync(dto.PartnerId);

            if (requester == null || partner == null) throw new Exception("Nhân viên không tồn tại.");
            if (requester.DepartmentId != partner.DepartmentId) 
                throw new Exception("Chỉ được hoán đổi ca với đồng nghiệp cùng bộ phận.");

            // Validate Lead Time (12h)
            if (dto.StartDate < DateTime.Now.AddHours(12))
                throw new Exception("Đơn phải được gửi trước ngày đổi ca ít nhất 12 tiếng.");

            if (dto.StartDate > dto.EndDate)
                throw new Exception("Ngày kết thúc không được nhỏ hơn ngày bắt đầu.");

            var request = new ShiftSwapRequest
            {
                EmployeeAId = requesterId,
                EmployeeBId = dto.PartnerId,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                TargetShiftId = dto.TargetShiftId,
                Reason = dto.Reason,
                PhoneNumber = dto.PhoneNumber,
                Address = dto.Address,
                SignatureA = dto.SignatureA,
                SignedAtA = DateTime.UtcNow,
                Status = ShiftSwapRequestStatus.PendingPartner,
                CreatedAt = DateTime.UtcNow
            };

            _context.ShiftSwapRequests.Add(request);
            await _context.SaveChangesAsync();

            // Notify Partner
            await _notificationService.CreateNotificationAsync(new Application.DTOs.Notification.CreateNotificationDto
            {
                EmployeeId = dto.PartnerId,
                Title = "Yêu cầu hoán đổi ca",
                Message = $"{requester.FullName} muốn hoán đổi ca làm việc với bạn.",
                Type = "ShiftSwap",
                RelatedId = request.Id.ToString()
            });

            return request;
        }

        public async Task<ShiftSwapRequest> RespondAsPartnerAsync(int id, int partnerId, bool accepted, string? signatureB)
        {
            var request = await _context.ShiftSwapRequests
                .Include(r => r.EmployeeA)
                .Include(r => r.EmployeeB)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (request == null || request.EmployeeBId != partnerId) throw new Exception("Yêu cầu không hợp lệ.");
            if (request.Status != ShiftSwapRequestStatus.PendingPartner) throw new Exception("Yêu cầu đã được xử lý.");

            if (accepted)
            {
                request.Status = ShiftSwapRequestStatus.PendingManager;
                request.SignatureB = signatureB;
                request.SignedAtB = DateTime.UtcNow;

                // Notify Manager
                var dept = await _context.Departments.FindAsync(request.EmployeeA.DepartmentId);
                if (dept?.ManagerId != null)
                {
                    await _notificationService.CreateNotificationAsync(new Application.DTOs.Notification.CreateNotificationDto
                    {
                        EmployeeId = dept.ManagerId.Value,
                        Title = "Phê duyệt đổi ca",
                        Message = $"Có đơn xin hoán đổi ca giữa {request.EmployeeA.FullName} và {request.EmployeeB.FullName}.",
                        Type = "ShiftSwap",
                        RelatedId = request.Id.ToString()
                    });
                }
            }
            else
            {
                request.Status = ShiftSwapRequestStatus.Rejected;
                request.RejectReason = "Đối tác từ chối hoán đổi ca.";

                await _notificationService.CreateNotificationAsync(new Application.DTOs.Notification.CreateNotificationDto
                {
                    EmployeeId = request.EmployeeAId,
                    Title = "Yêu cầu hoán đổi ca bị từ chối",
                    Message = $"{request.EmployeeB.FullName} đã từ chối yêu cầu của bạn.",
                    Type = "ShiftSwap",
                    RelatedId = request.Id.ToString()
                });
            }

            await _context.SaveChangesAsync();
            return request;
        }

        public async Task<ShiftSwapRequest> ApproveByManagerAsync(int id, int managerId, bool approved, string? signatureManager, string? rejectReason)
        {
            var request = await _context.ShiftSwapRequests
                .Include(r => r.EmployeeA)
                .Include(r => r.EmployeeB)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (request == null) throw new Exception("Không tìm thấy đơn.");
            if (request.Status != ShiftSwapRequestStatus.PendingManager) throw new Exception("Đơn không ở trạng thái chờ duyệt.");

            if (approved)
            {
                request.Status = ShiftSwapRequestStatus.PendingHR;
                request.ManagerId = managerId;
                request.SignatureManager = signatureManager;
                request.SignedAtManager = DateTime.UtcNow;

                // Notify HR (Assuming there's a way to find HR or a general HR notification)
                // For now, let's assume we notify specifically the C&B team if possible, or just log.
            }
            else
            {
                request.Status = ShiftSwapRequestStatus.Rejected;
                request.RejectReason = rejectReason;
                request.ManagerId = managerId;
                request.SignedAtManager = DateTime.UtcNow;

                await _notificationService.CreateNotificationAsync(new Application.DTOs.Notification.CreateNotificationDto
                {
                    EmployeeId = request.EmployeeAId,
                    Title = "Đơn hoán đổi ca bị từ chối",
                    Message = $"Quản lý đã từ chối đơn của bạn. Lý do: {rejectReason}",
                    Type = "ShiftSwap",
                    RelatedId = request.Id.ToString()
                });
            }

            await _context.SaveChangesAsync();
            return request;
        }

        public async Task<ShiftSwapRequest> ConfirmByHRAsync(int id, int hrId, bool confirmed, string? signatureHR, string? rejectReason)
        {
            var request = await _context.ShiftSwapRequests
                .Include(r => r.EmployeeA)
                .Include(r => r.EmployeeB)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (request == null) throw new Exception("Không tìm thấy đơn.");
            if (request.Status != ShiftSwapRequestStatus.PendingHR) throw new Exception("Đơn chưa đủ điều kiện xác nhận.");

            if (confirmed)
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    request.Status = ShiftSwapRequestStatus.Approved;
                    request.HRId = hrId;
                    request.SignatureHR = signatureHR;
                    request.SignedAtHR = DateTime.UtcNow;

                    // UPDATE WORK SCHEDULES (SWAP IN THE BLOCK)
                    for (DateTime date = request.StartDate.Date; date <= request.EndDate.Date; date = date.AddDays(1))
                    {
                        var shiftA = await GetAssignedShiftIdAsync(request.EmployeeAId, date);
                        var shiftB = await GetAssignedShiftIdAsync(request.EmployeeBId, date);

                        var assignToA = request.TargetShiftId ?? shiftB;
                        var assignToB = shiftA;

                        if (assignToA != null || assignToB != null)
                        {
                            await UpdateScheduleAsync(request.EmployeeAId, date, assignToA, $"Hoán đổi ca cho {request.EmployeeB.FullName} (Đơn #{request.Id})");
                            await UpdateScheduleAsync(request.EmployeeBId, date, assignToB, $"Hoán đổi ca cho {request.EmployeeA.FullName} (Đơn #{request.Id})");
                        }
                    }

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    // Generate PDF (placeholder for now)
                    // request.PdfUrl = await GeneratePdfInternal(request);
                    // await _context.SaveChangesAsync();

                    // Notify both
                    var msg = "Đổi ca thành công. Lịch làm việc mới đã được cập nhật.";
                    await _notificationService.CreateNotificationAsync(new Application.DTOs.Notification.CreateNotificationDto { EmployeeId = request.EmployeeAId, Title = "Đổi ca thành công", Message = msg, Type = "ShiftSwap", RelatedId = request.Id.ToString() });
                    await _notificationService.CreateNotificationAsync(new Application.DTOs.Notification.CreateNotificationDto { EmployeeId = request.EmployeeBId, Title = "Đổi ca thành công", Message = msg, Type = "ShiftSwap", RelatedId = request.Id.ToString() });
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }
            else
            {
                request.Status = ShiftSwapRequestStatus.Rejected;
                request.RejectReason = rejectReason;
                request.HRId = hrId;
                await _context.SaveChangesAsync();
            }

            return request;
        }

        private async Task<int?> GetAssignedShiftIdAsync(int employeeId, DateTime date)
        {
            var schedule = await _context.WorkSchedules
                .FirstOrDefaultAsync(ws => ws.EmployeeId == employeeId && ws.WorkingDate.Date == date.Date);

            if (schedule != null) return schedule.WorkShiftId;

            var employee = await _context.Employees
                .Include(e => e.Contracts)
                .FirstOrDefaultAsync(e => e.Id == employeeId);

            var activeContract = employee?.Contracts?.FirstOrDefault(c => c.IsActive && c.ShiftId.HasValue);
            return activeContract?.ShiftId;
        }

        private async Task UpdateScheduleAsync(int employeeId, DateTime date, int? newShiftId, string note)
        {
            var schedule = await _context.WorkSchedules
                .FirstOrDefaultAsync(ws => ws.EmployeeId == employeeId && ws.WorkingDate.Date == date.Date);

            if (schedule != null)
            {
                schedule.WorkShiftId = newShiftId;
                schedule.Note = note;
                schedule.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                // Fallback: If no schedule exists, try to find the period and create one
                var period = await _context.SchedulePeriods
                    .FirstOrDefaultAsync(p => date.Date >= p.StartDate.Date && date.Date <= p.EndDate.Date);
                
                if (period != null)
                {
                    _context.WorkSchedules.Add(new WorkSchedule
                    {
                        EmployeeId = employeeId,
                        WorkingDate = date,
                        WorkShiftId = newShiftId,
                        PeriodId = period.Id,
                        Note = note,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }
        }

        public async Task<ShiftSwapRequest> CancelRequestAsync(int id, int requesterId)
        {
            var request = await _context.ShiftSwapRequests.FindAsync(id);
            if (request == null || request.EmployeeAId != requesterId) throw new Exception("Không có quyền.");
            if (request.Status != ShiftSwapRequestStatus.PendingPartner && request.Status != ShiftSwapRequestStatus.PendingManager)
                throw new Exception("Quá trình phê duyệt đã bắt đầu, không thể hủy.");

            request.Status = ShiftSwapRequestStatus.Cancelled;
            await _context.SaveChangesAsync();
            return request;
        }

        public async Task<byte[]> GeneratePdfAsync(int requestId)
        {
            // Implementation using iText7
            var request = await GetByIdAsync(requestId);
            if (request == null) throw new Exception("Không tìm thấy đơn.");

            using (var ms = new MemoryStream())
            {
                var writer = new PdfWriter(ms);
                var pdf = new PdfDocument(writer);
                var document = new Document(pdf);

                document.Add(new Paragraph("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM").SetTextAlignment(iText.Layout.Properties.TextAlignment.CENTER).SetBold());
                document.Add(new Paragraph("Độc lập - Tự do - Hạnh phúc").SetTextAlignment(iText.Layout.Properties.TextAlignment.CENTER).SetUnderline());
                document.Add(new Paragraph("\n"));
                document.Add(new Paragraph("ĐƠN XIN ĐỔI CA LÀM VIỆC").SetTextAlignment(iText.Layout.Properties.TextAlignment.CENTER).SetFontSize(16).SetBold());
                document.Add(new Paragraph("\nKính gửi: Ban Giám Đốc và Phòng Hành chính – Nhân sự"));

                document.Add(new Paragraph($"Người làm đơn: {request.EmployeeA.FullName} / Mã NV: {request.EmployeeA.EmployeeCode}"));
                document.Add(new Paragraph($"Bộ phận: {request.EmployeeA.Department.DepartmentName}"));
                
                document.Add(new Paragraph($"Tôi xin hoán đổi ca làm việc với đồng nghiệp: {request.EmployeeB.FullName} / Mã NV: {request.EmployeeB.EmployeeCode}"));
                document.Add(new Paragraph("Nội dung hoán đổi:"));
                document.Add(new Paragraph($"- Đổi toàn bộ lịch làm việc của 2 bên."));
                document.Add(new Paragraph($"- Thời gian thực hiện: Từ ngày {request.StartDate:dd/MM/yyyy} đến ngày {request.EndDate:dd/MM/yyyy}."));
                
                document.Add(new Paragraph($"Lý do: {request.Reason}"));
                document.Add(new Paragraph("Cam kết: Tôi xin hứa sẽ cập nhật đầy đủ nội dung công tác trong thời gian vắng và thực hiện đúng ca làm việc đã đổi."));

                // Signature block
                Table table = new Table(new float[] { 1, 1, 1, 1 });
                table.AddCell(new Cell().Add(new Paragraph("Người làm đơn\n(Ký và ghi rõ họ tên)")));
                table.AddCell(new Cell().Add(new Paragraph("Người xác nhận\n(Đối tác đổi ca)")));
                table.AddCell(new Cell().Add(new Paragraph("Trưởng bộ phận")));
                table.AddCell(new Cell().Add(new Paragraph("Phòng Nhân sự")));

                // Placeholder for signatures (Signatures are base64, would need to convert to Image objects)
                // table.AddCell(new Cell().Add(new Paragraph(request.SignatureA?.Length > 0 ? "DONE" : "")));
                // ... logic to parse base64 signatures ...

                document.Add(table);
                document.Close();
                return ms.ToArray();
            }
        }
    }
}
