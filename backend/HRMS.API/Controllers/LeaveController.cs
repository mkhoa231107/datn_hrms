using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HRMS.Application.DTOs.Leave;
using HRMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HRMS.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class LeaveController : ControllerBase
    {
        private readonly ILeaveService _leaveService;
        private readonly IAuditLogService _auditLogService;

        public LeaveController(ILeaveService leaveService, IAuditLogService auditLogService)
        {
            _leaveService = leaveService;
            _auditLogService = auditLogService;
        }

        [HttpGet("debug-my-scope")]
        public IActionResult GetMyScope()
        {
            var roles = User.Claims.Where(c => c.Type == System.Security.Claims.ClaimTypes.Role).Select(c => c.Value).ToList();
            var deptId = User.FindFirst("DepartmentId")?.Value;
            var empId = GetEmployeeId();
            
            return Ok(new { 
                Roles = roles, 
                DepartmentId = deptId, 
                EmployeeId = empId,
                Username = User.Identity?.Name
            });
        }

        private int GetEmployeeId()
        {
            var claim = User.FindFirst("EmployeeId")?.Value;
            if (string.IsNullOrEmpty(claim) || claim == "0")
                throw new UnauthorizedAccessException("Tài khoản chưa được liên kết với hồ sơ nhân viên.");
            return int.Parse(claim);
        }

        // ==================== REFERENCE DATA ====================

        /// <summary>Danh sách loại nghỉ phép</summary>
        [HttpGet("types")]
        public async Task<IActionResult> GetLeaveTypes()
        {
            var types = await _leaveService.GetLeaveTypesAsync();
            return Ok(new { success = true, data = types });
        }

        // ==================== EMPLOYEE ENDPOINTS ====================

        [HttpGet("fix-balances")]
        [AllowAnonymous]
        public async Task<IActionResult> FixBalances([FromServices] HRMS.Infrastructure.Data.HRMSDbContext _context)
        {
            var year = DateTime.Now.Year;
            var employees = _context.Employees.ToList();
            var leaveTypes = _context.LeaveTypes.ToList();
            var existingBalances = _context.LeaveBalances.Where(b => b.Year == year).ToList();
            var existingMap = new HashSet<(int, int)>(existingBalances.Select(b => (b.EmployeeId, b.LeaveTypeId)));
            int count = 0;
            foreach(var emp in employees) {
                foreach(var lt in leaveTypes) {
                    if (!existingMap.Contains((emp.Id, lt.Id))) {
                        _context.LeaveBalances.Add(new HRMS.Domain.Entities.LeaveBalance {
                            EmployeeId = emp.Id, LeaveTypeId = lt.Id, Year = year, TotalDays = lt.DefaultDaysPerYear, UsedDays = 0, CreatedAt = DateTime.UtcNow
                        });
                        count++;
                    }
                }
            }
            if (count > 0) await _context.SaveChangesAsync();
            return Ok(new { success = true, seeded = count, message = $"Seeded {count} balances" });
        }

        /// <summary>Số dư ngày phép của tôi trong năm</summary>
        [HttpGet("my-balance")]
        public async Task<IActionResult> GetMyBalance([FromQuery] int? year)
        {
            try
            {
                var empId = GetEmployeeId();
                var targetYear = year ?? DateTime.Now.Year;
                var balances = await _leaveService.GetMyBalancesAsync(empId, targetYear);
                return Ok(new { success = true, data = balances });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
        }

        /// <summary>Danh sách đơn nghỉ của tôi</summary>
        [HttpGet("my-requests")]
        public async Task<IActionResult> GetMyRequests()
        {
            try
            {
                var empId = GetEmployeeId();
                var requests = await _leaveService.GetMyRequestsAsync(empId);
                return Ok(new { success = true, data = requests });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("request")]
        public async Task<IActionResult> CreateRequest([FromBody] LeaveRequestCreateDto dto)
        {
            try
            {
                var empId = GetEmployeeId();
                var result = await _leaveService.CreateRequestAsync(empId, dto);
                return Ok(new { success = true, data = result, message = "Gửi đơn nghỉ phép thành công!" });
            }
            catch (InvalidOperationException ex)
            {
                Console.WriteLine($"[LEAVE_ERROR] 400 InvalidOperation: {ex.Message}");
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                Console.WriteLine($"[LEAVE_ERROR] 401 Unauthorized: {ex.Message}");
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[LEAVE_ERROR] 500 Global: {ex.Message}\n{ex.StackTrace}");
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        /// <summary>Hủy đơn nghỉ (chỉ khi đang Pending)</summary>
        [HttpDelete("request/{requestId}")]
        public async Task<IActionResult> CancelRequest(int requestId)
        {
            try
            {
                var empId = GetEmployeeId();
                await _leaveService.CancelRequestAsync(requestId, empId);
                return Ok(new { success = true, message = "Đã hủy đơn nghỉ phép." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
        }

        // ==================== MANAGER ENDPOINTS ====================

        /// <summary>Danh sách đơn nghỉ cần duyệt (TeamLeader / Manager)</summary>
        [HttpGet("to-approve")]
        [Authorize(Roles = "Admin,DepartmentManager,DepartmentHead")]
        public async Task<IActionResult> GetRequestsToApprove()
        {
            try
            {
                var approverId = GetEmployeeId();
                var requests = await _leaveService.GetRequestsToApproveAsync(approverId, User);
                return Ok(new { success = true, data = requests });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        /// <summary>Lịch sử duyệt đơn của tôi</summary>
        [HttpGet("history")]
        [Authorize(Roles = "Admin,DepartmentManager,DepartmentHead")]
        public async Task<IActionResult> GetApprovalHistory()
        {
            try
            {
                var approverId = GetEmployeeId();
                var history = await _leaveService.GetApprovalHistoryAsync(approverId);
                return Ok(new { success = true, data = history });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        /// <summary>Duyệt đơn nghỉ</summary>
        [HttpPost("request/{requestId}/approve")]
        [Authorize(Roles = "Admin,DepartmentManager,DepartmentHead")]
        public async Task<IActionResult> ApproveRequest(int requestId, [FromBody] LeaveApprovalDto dto)
        {
            try
            {
                var approverId = GetEmployeeId();
                await _leaveService.ApproveRequestAsync(requestId, approverId, User, dto.Note);
                return Ok(new { success = true, message = "Đã duyệt đơn nghỉ phép." });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        /// <summary>Từ chối đơn nghỉ</summary>
        [HttpPost("request/{requestId}/reject")]
        [Authorize(Roles = "Admin,DepartmentManager,DepartmentHead")]
        public async Task<IActionResult> RejectRequest(int requestId, [FromBody] LeaveApprovalDto dto)
        {
            try
            {
                var approverId = GetEmployeeId();
                await _leaveService.RejectRequestAsync(requestId, approverId, User, dto.Note);
                return Ok(new { success = true, message = "Đã từ chối đơn nghỉ phép." });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }
    }
}
