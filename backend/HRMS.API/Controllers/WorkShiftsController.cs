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
    public class WorkShiftsController : ControllerBase
    {
        private readonly IWorkShiftService _workShiftService;

        public WorkShiftsController(IWorkShiftService workShiftService)
        {
            _workShiftService = workShiftService;
        }

        private int GetOrgId() => int.Parse(User.FindFirst("OrganizationId")?.Value ?? "1");

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _workShiftService.GetAllAsync(GetOrgId());
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _workShiftService.GetByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> Create(WorkShiftCreateDto dto)
        {
            dto.OrganizationId = GetOrgId();
            var id = await _workShiftService.CreateAsync(dto);
            return Ok(new { id });
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, WorkShiftCreateDto dto)
        {
            dto.OrganizationId = GetOrgId();
            await _workShiftService.UpdateAsync(id, dto);
            return Ok();
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _workShiftService.DeleteAsync(id);
            return Ok();
        }

        [Authorize(Roles = "Admin,HrAdmin")]
        [HttpPost("department-defaults")]
        public async Task<IActionResult> SetDepartmentDefault(int deptId, int shiftId)
        {
            await _workShiftService.SetDepartmentDefaultShiftAsync(deptId, shiftId);
            return Ok();
        }

        [HttpGet("department-defaults/{deptId}")]
        public async Task<IActionResult> GetDepartmentDefault(int deptId)
        {
            var result = await _workShiftService.GetDepartmentDefaultShiftAsync(deptId);
            return Ok(result);
        }
    }
}
