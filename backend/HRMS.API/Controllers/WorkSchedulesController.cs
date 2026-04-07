using HRMS.Application.DTOs.Scheduling;
using HRMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace HRMS.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class WorkSchedulesController : ControllerBase
    {
        private readonly IWorkScheduleService _scheduleService;

        public WorkSchedulesController(IWorkScheduleService scheduleService)
        {
            _scheduleService = scheduleService;
        }

        private int GetOrgId() => int.Parse(User.FindFirst("OrganizationId")?.Value ?? "1");

        [HttpGet("matrix")]
        public async Task<IActionResult> GetMatrix(int periodId, int? deptId)
        {
            var matrix = await _scheduleService.GetMatrixAsync(periodId, User, deptId);
            return Ok(matrix);
        }

        [HttpGet("personal")]
        public async Task<IActionResult> GetPersonalSchedule(int periodId)
        {
            var schedule = await _scheduleService.GetPersonalScheduleAsync(periodId, User);
            return Ok(schedule);
        }

        [Authorize(Roles = "Admin,DepartmentManager,DepartmentHead")]
        [HttpPost("bulk-assign")]
        public async Task<IActionResult> BulkAssign(BulkAssignDto dto)
        {
            await _scheduleService.BulkAssignAsync(dto, User);
            return Ok();
        }

        [Authorize(Roles = "Admin,DepartmentManager,DepartmentHead")]
        [HttpPost("copy-previous")]
        public async Task<IActionResult> CopyPrevious(CopyScheduleDto dto)
        {
            await _scheduleService.CopyPreviousMonthAsync(dto, User);
            return Ok();
        }

        [Authorize(Roles = "Admin,DepartmentManager,DepartmentHead")]
        [HttpPost("apply-template")]
        public async Task<IActionResult> ApplyTemplate(ApplyTemplateDto dto)
        {
            await _scheduleService.ApplyTemplateAsync(dto, User);
            return Ok();
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("lock/{periodId}")]
        public async Task<IActionResult> Lock(int periodId)
        {
            await _scheduleService.LockPeriodAsync(periodId);
            return Ok();
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("unlock/{periodId}")]
        public async Task<IActionResult> Unlock(int periodId)
        {
            await _scheduleService.UnlockPeriodAsync(periodId);
            return Ok();
        }

        [HttpGet("periods")]
        public async Task<IActionResult> GetPeriods()
        {
            var periods = await _scheduleService.GetPeriodsAsync(GetOrgId());
            return Ok(periods);
        }

        [HttpGet("templates")]
        public async Task<IActionResult> GetTemplates()
        {
            var templates = await _scheduleService.GetTemplatesAsync(GetOrgId());
            return Ok(templates);
        }

        [Authorize(Roles = "Admin,DepartmentManager,DepartmentHead")]
        [HttpPost("periods")]
        public async Task<IActionResult> CreatePeriod(SchedulePeriodCreateDto dto)
        {
            dto.OrganizationId = GetOrgId();
            var id = await _scheduleService.CreatePeriodAsync(dto);
            return Ok(new { id });
        }

        [Authorize(Roles = "Admin,HrAdmin,DepartmentManager,DepartmentHead")]
        [HttpPost("auto-schedule-dept")]
        public async Task<IActionResult> AutoScheduleDept([FromBody] AutoScheduleDeptDto dto)
        {
            try
            {
                var result = await _scheduleService.AutoScheduleDepartmentAsync(dto, User);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
