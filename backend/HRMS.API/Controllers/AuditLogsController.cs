using HRMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace HRMS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AuditLogsController : ControllerBase
    {
        private readonly IAuditLogService _auditLogService;

        public AuditLogsController(IAuditLogService auditLogService)
        {
            _auditLogService = auditLogService;
        }

        [HttpGet("department")]
        [Authorize(Roles = "Admin,DepartmentManager,DepartmentHead")]
        public async Task<IActionResult> GetDepartmentActivities()
        {
            try
            {
                // 1. Global Admins see everything
                if (User.IsInRole("Admin"))
                {
                    var allLogs = await _auditLogService.GetRecentLogsAsync();
                    return Ok(allLogs);
                }

                // 2. Department Manager or Department Head see their department
                if (User.IsInRole("DepartmentManager") || User.IsInRole("DepartmentHead"))
                {
                    var deptIdStr = User.FindFirst("DepartmentId")?.Value;
                    if (int.TryParse(deptIdStr, out int deptId))
                    {
                        var activities = await _auditLogService.GetDepartmentActivitiesAsync(deptId);
                        return Ok(activities);
                    }
                }

                return Ok(Array.Empty<object>());
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
