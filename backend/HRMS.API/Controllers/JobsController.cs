using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using HRMS.Application.DTOs.Jobs;
using HRMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HRMS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class JobsController : ControllerBase
    {
        private readonly IJobService _jobService;

        public JobsController(IJobService jobService)
        {
            _jobService = jobService;
        }

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateTask([FromBody] JobCreateDto dto)
        {
            try
            {
                var managerId = GetUserId();
                var id = await _jobService.CreateJobAsync(managerId, dto);
                return Ok(new { message = "Giao việc thành công", id });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("my-tasks")]
        [Authorize(Roles = "Employee,DeptManager,Admin")]
        public async Task<IActionResult> GetMyTasks()
        {
            var userId = GetUserId();
            var tasks = await _jobService.GetEmployeeTasksAsync(userId);
            return Ok(tasks);
        }

        [HttpGet("managed-tasks")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetManagedTasks()
        {
            var managerId = GetUserId();
            var tasks = await _jobService.GetManagerTasksAsync(managerId);
            return Ok(tasks);
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Employee,Admin")]
        public async Task<IActionResult> GetTaskById(int id)
        {
            try
            {
                var userId = GetUserId();
                var isAdmin = User.IsInRole("Admin");

                var task = await _jobService.GetJobByIdAsync(id, userId, isAdmin);
                return Ok(task);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/progress")]
        [Authorize(Roles = "Employee,Admin")]
        public async Task<IActionResult> UpdateProgress(int id, [FromBody] JobUpdateProgressDto dto)
        {
            try
            {
                var userId = GetUserId();
                await _jobService.UpdateProgressAsync(userId, id, dto);
                return Ok(new { message = "Cập nhật tiến độ thành công" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/evaluate")]
        [Authorize(Roles = "Admin,HrAdmin")]
        public async Task<IActionResult> Evaluate(int id, [FromBody] JobEvaluationDto dto)
        {
            try
            {
                var managerId = GetUserId();
                await _jobService.EvaluateJobAsync(managerId, id, dto);
                return Ok(new { message = "Đánh giá công việc thành công" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
