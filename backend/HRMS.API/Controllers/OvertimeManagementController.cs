using HRMS.Application.DTOs.Attendance;
using HRMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace HRMS.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class OvertimeManagementController : ControllerBase
    {
        private readonly IAttendanceService _attendanceService;

        public OvertimeManagementController(IAttendanceService attendanceService)
        {
            _attendanceService = attendanceService;
        }

        private int GetEmployeeId()
        {
            var empIdClaim = User.FindFirst("EmployeeId")?.Value;
            if (string.IsNullOrEmpty(empIdClaim) || empIdClaim == "0")
                throw new UnauthorizedAccessException("Tài khoản của bạn không được liên kết với hồ sơ nhân viên.");
            return int.Parse(empIdClaim);
        }

        private int GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.Parse(userIdClaim ?? "0");
        }

        /// <summary>
        /// [Department Head] Lập kế hoạch tăng ca tháng cho phòng
        /// </summary>
        [HttpPost("plans")]
        [Authorize(Roles = "Admin,DepartmentHead")]
        public async Task<IActionResult> CreatePlan([FromBody] CreateOvertimePlanDto dto)
        {
            try
            {
                var userId = GetUserId();
                var result = await _attendanceService.CreateOvertimePlanAsync(dto, userId);
                return Ok(new { success = true, data = result, message = "Đã tạo kế hoạch tăng ca thành công." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// [Dept Head/C&B/Admin] Xem danh sách kế hoạch
        /// </summary>
        [HttpGet("plans")]
        [Authorize(Roles = "Admin,DepartmentHead,CnbSpecialist")]
        public async Task<IActionResult> GetPlans([FromQuery] int? departmentId, [FromQuery] int? month, [FromQuery] int? year)
        {
            try
            {
                var result = await _attendanceService.GetOvertimePlansAsync(departmentId, month, year);
                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// [Team Leader] Đề cử nhân sự tăng ca hàng loạt (Grid save)
        /// </summary>
        [HttpPost("assignments/bulk")]
        [Authorize(Roles = "Admin,DepartmentHead,TeamLeader")]
        public async Task<IActionResult> BulkAssign([FromBody] BulkAssignOvertimeDto dto)
        {
            try
            {
                var userId = GetUserId();
                var result = await _attendanceService.BulkAssignOvertimeAsync(dto, userId);
                return Ok(new { success = true, message = "Đã lưu đề cử tăng ca thành công." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// [Team Leader/Dept Head] Lấy lưới đề cử nhân sự bộ phận
        /// </summary>
        [HttpGet("assignments/grid")]
        [Authorize(Roles = "Admin,DepartmentHead,TeamLeader")]
        public async Task<IActionResult> GetAssignmentGrid([FromQuery] int departmentId, [FromQuery] int month, [FromQuery] int year)
        {
            try
            {
                var result = await _attendanceService.GetOvertimeAssignmentGridAsync(departmentId, month, year);
                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }


        /// <summary>
        /// [Employee] Xem lịch tăng ca cá nhân
        /// </summary>
        [HttpGet("my-schedule")]
        public async Task<IActionResult> GetMySchedule([FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
        {
            try
            {
                var employeeId = GetEmployeeId();
                var result = await _attendanceService.GetMyOvertimeAssignmentsAsync(employeeId, fromDate, toDate);
                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// [Department Head] Gửi kế hoạch tăng ca (Publish)
        /// </summary>
        [HttpPost("plans/{id}/publish")]
        [Authorize(Roles = "Admin,DepartmentHead")]
        public async Task<IActionResult> PublishPlan(int id)
        {
            try
            {
                var userId = GetUserId();
                await _attendanceService.PublishOvertimePlanAsync(id, userId);
                return Ok(new { success = true, message = "Đã gửi kế hoạch tăng ca thành công." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// [Employee] Xác nhận đã nắm thông tin tăng ca
        /// </summary>
        [HttpPost("assignments/{id}/confirm")]
        public async Task<IActionResult> ConfirmAssignment(int id)
        {
            try
            {
                var employeeId = GetEmployeeId();
                await _attendanceService.ConfirmOvertimeAssignmentAsync(id, employeeId);
                return Ok(new { success = true, message = "Đã xác nhận thành công." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
    }
}
