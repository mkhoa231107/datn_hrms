using Microsoft.AspNetCore.Mvc;
using HRMS.Application.Interfaces.Recruitment;
using HRMS.Application.DTOs.Recruitment;
using Microsoft.AspNetCore.Authorization;
using System.Threading.Tasks;
using System.Security.Claims;
using System.Linq;
using System;
using HRMS.Domain.Enums;

namespace HRMS.API.Controllers.Recruitment
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,HrAdmin,DepartmentHead")] // HR roles required
    public class HRRecruitmentController : ControllerBase
    {
        private readonly IJobPostingService _jobService;
        private readonly IJobApplicationService _applicationService;
        private readonly IAICvScreeningService _aiScreeningService;
        private readonly ICompanyNewsService _newsService;

        public HRRecruitmentController(
            IJobPostingService jobService, 
            IJobApplicationService applicationService, 
            IAICvScreeningService aiScreeningService,
            ICompanyNewsService newsService)
        {
            _jobService = jobService;
            _applicationService = applicationService;
            _aiScreeningService = aiScreeningService;
            _newsService = newsService;
        }

        private int GetCurrentUserId()
        {
            var claim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
            if (claim != null && int.TryParse(claim.Value, out int id)) return id;
            return 1;
        }

        // === JOBS ===
        [HttpGet("jobs")]
        public async Task<IActionResult> GetAllJobs() => Ok(await _jobService.GetAllJobPostingsAsync(true));

        [HttpPost("jobs")]
        public async Task<IActionResult> CreateJob([FromBody] CreateJobPostingDto dto) 
            => Ok(await _jobService.CreateJobPostingAsync(GetCurrentUserId(), dto));

        [HttpPut("jobs/{id}")]
        public async Task<IActionResult> UpdateJob(int id, [FromBody] CreateJobPostingDto dto) 
            => Ok(await _jobService.UpdateJobPostingAsync(id, GetCurrentUserId(), dto));

        [HttpPost("jobs/{id}/toggle-status")]
        public async Task<IActionResult> ToggleJobStatus(int id)
        {
            await _jobService.ToggleJobPostingStatusAsync(id, GetCurrentUserId());
            return Ok();
        }

        // === APPLICATIONS ===
        [HttpGet("jobs/{jobId}/applications")]
        public async Task<IActionResult> GetApplicationsForJob(int jobId)
            => Ok(await _applicationService.GetApplicationsByJobIdAsync(jobId));

        [HttpPost("applications/{id}/screen")]
        public async Task<IActionResult> RunAiScreening(int id)
        {
            Console.WriteLine($"\n[API-DEBUG] Received request to screen application ID: {id}");
            try
            {
                var result = await _applicationService.ScreenApplicationAsync(id);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpPost("applications/{id}/accept")]
        public async Task<IActionResult> SendAcceptance(int id)
        {
            try
            {
                await _applicationService.UpdateApplicationStatusAsync(id, GetCurrentUserId(), ApplicationStatus.HRApproved);
                return Ok(new { Success = true, Message = "Đã duyệt và chuyển trạng thái thành viên" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        // === NEWS ===
        [HttpGet("news")]
        public async Task<IActionResult> GetAllNews() => Ok(await _newsService.GetAllNewsAsync(true));

        [HttpPost("news")]
        public async Task<IActionResult> CreateNews([FromBody] CreateCompanyNewsDto dto) 
            => Ok(await _newsService.CreateNewsAsync(GetCurrentUserId(), dto));

        [HttpPut("news/{id}")]
        public async Task<IActionResult> UpdateNews(int id, [FromBody] CreateCompanyNewsDto dto) 
            => Ok(await _newsService.UpdateNewsAsync(id, GetCurrentUserId(), dto));
            
        [HttpDelete("news/{id}")]
        public async Task<IActionResult> DeleteNews(int id)
        {
            await _newsService.DeleteNewsAsync(id, GetCurrentUserId());
            return Ok();
        }
    }
}
