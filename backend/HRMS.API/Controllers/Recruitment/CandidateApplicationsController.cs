using Microsoft.AspNetCore.Mvc;
using HRMS.Application.Interfaces.Recruitment;
using HRMS.Application.DTOs.Recruitment;
using Microsoft.AspNetCore.Authorization;
using System.Threading.Tasks;
using System.Security.Claims;
using System.Linq;
using System;

namespace HRMS.API.Controllers.Recruitment
{
    public class CandidateApplicationForm
    {
        public string? JobPostingId { get; set; }
        public string? CandidateName { get; set; }
        public string? CandidateEmail { get; set; }
        public string? CandidatePhone { get; set; }
        public Microsoft.AspNetCore.Http.IFormFile? CVFile { get; set; }
        public string? CoverLetter { get; set; }
    }

    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CandidateApplicationsController : ControllerBase
    {
        private readonly IJobApplicationService _applicationService;

        public CandidateApplicationsController(IJobApplicationService applicationService)
        {
            _applicationService = applicationService;
        }

        private int? GetCurrentUserId()
        {
            var claim = User?.Claims?.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
            if (claim != null && int.TryParse(claim.Value, out int id)) return id;
            return null; // Public user applying 
        }

        [HttpPost]
        public async Task<IActionResult> Apply([FromForm] CandidateApplicationForm request)
        {
            if (request.CVFile == null) return BadRequest(new { Message = "Vui lòng đính kèm file CV" });
            if (string.IsNullOrWhiteSpace(request.CandidateName) || string.IsNullOrWhiteSpace(request.CandidateEmail)) 
                return BadRequest(new { Message = "Vui lòng điền đầy đủ tên và email" });
                
            if (!int.TryParse(request.JobPostingId, out int jobId))
            {
                // Xử lý nộp CV cho các vị trí mẫu (demo1, demo2...)
                return Ok(new { Message = "Cảm ơn bạn đã ứng tuyển vị trí Demo! (Dữ liệu mẫu không lưu vào Database)." });
            }

            try
            {
                var userId = GetCurrentUserId();
                var dto = new CreateJobApplicationDto
                {
                    JobPostingId = jobId,
                    CandidateName = request.CandidateName,
                    CandidateEmail = request.CandidateEmail,
                    CandidatePhone = request.CandidatePhone,
                    CoverLetter = request.CoverLetter
                };

                if (request.CVFile != null)
                {
                    dto.CVFileName = request.CVFile.FileName;
                    dto.CVFileStream = request.CVFile.OpenReadStream();
                }

                var result = await _applicationService.CreateApplicationAsync(userId, dto);
                
                // Dispose the stream if we handled it this way, but OpenReadStream doesn't strictly need it if disposed by request, but good practice.
                if (dto.CVFileStream != null) dto.CVFileStream.Dispose();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpGet("my")]
        public async Task<IActionResult> GetMyApplications()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized(new { Message = "Bạn cần đăng nhập để xem hồ sơ của mình" });
            return Ok(await _applicationService.GetApplicationsByCandidateAsync(userId.Value));
        }
    }
}
