using HRMS.Application.DTOs.Recruitment;
using HRMS.Application.Interfaces.Recruitment;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace HRMS.API.Controllers.Recruitment
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,HrAdmin,DepartmentHead")] // HR roles required
    public class JobCriteriaController : ControllerBase
    {
        private readonly IJobCriteriaService _criteriaService;

        public JobCriteriaController(IJobCriteriaService criteriaService)
        {
            _criteriaService = criteriaService;
        }

        [HttpGet("job/{jobPostingId}")]
        public async Task<IActionResult> GetByJobId(int jobPostingId)
        {
            var result = await _criteriaService.GetByJobPostingIdAsync(jobPostingId);
            if (result == null)
            {
                return NotFound(new { message = "Chưa thiết lập tiêu chí cho vị trí tuyển dụng này" });
            }
            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> UpsertCriteria([FromBody] UpsertJobCriteriaDto dto)
        {
            try
            {
                var result = await _criteriaService.UpsertCriteriaAsync(dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
