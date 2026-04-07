using Microsoft.AspNetCore.Mvc;
using HRMS.Application.Interfaces.Recruitment;
using Microsoft.AspNetCore.Authorization;
using System.Threading.Tasks;

namespace HRMS.API.Controllers.Recruitment
{
    [Route("api/[controller]")]
    [ApiController]
    [AllowAnonymous]
    public class PublicCareersController : ControllerBase
    {
        private readonly IJobPostingService _jobService;
        private readonly ICompanyNewsService _newsService;

        public PublicCareersController(IJobPostingService jobService, ICompanyNewsService newsService)
        {
            _jobService = jobService;
            _newsService = newsService;
        }

        [HttpGet("jobs")]
        public async Task<IActionResult> GetActiveJobs()
        {
            return Ok(await _jobService.GetAllJobPostingsAsync(includeInactive: false));
        }

        [HttpGet("jobs/{id}")]
        public async Task<IActionResult> GetJobById(int id)
        {
            var job = await _jobService.GetJobPostingByIdAsync(id);
            if (job == null || !job.IsActive) return NotFound();
            return Ok(job);
        }

        [HttpGet("news")]
        public async Task<IActionResult> GetPublishedNews()
        {
            return Ok(await _newsService.GetAllNewsAsync(includeUnpublished: false));
        }
    }
}
