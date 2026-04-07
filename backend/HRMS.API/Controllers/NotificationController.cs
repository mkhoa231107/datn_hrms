using HRMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace HRMS.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        private int GetEmployeeId()
        {
            var empIdClaim = User.FindFirst("EmployeeId")?.Value;
            if (string.IsNullOrEmpty(empIdClaim) || empIdClaim == "0")
                throw new UnauthorizedAccessException("Tài khoản của bạn không được liên kết với hồ sơ nhân viên.");
            return int.Parse(empIdClaim);
        }

        [HttpGet("my-notifications")]
        public async Task<IActionResult> GetMyNotifications()
        {
            try
            {
                var employeeId = GetEmployeeId();
                var result = await _notificationService.GetMyNotificationsAsync(employeeId);
                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            try
            {
                var employeeId = GetEmployeeId();
                var result = await _notificationService.MarkAsReadAsync(id, employeeId);
                return Ok(new { success = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            try
            {
                var employeeId = GetEmployeeId();
                var result = await _notificationService.MarkAllAsReadAsync(employeeId);
                return Ok(new { success = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
