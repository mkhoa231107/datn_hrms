using System;
using System.Threading.Tasks;
using HRMS.Application.DTOs.Scheduling;
using HRMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HRMS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ShiftChangeRequestsController : ControllerBase
    {
        private readonly IShiftChangeRequestService _shiftChangeRequestService;

        public ShiftChangeRequestsController(IShiftChangeRequestService shiftChangeRequestService)
        {
            _shiftChangeRequestService = shiftChangeRequestService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateRequest([FromBody] CreateShiftChangeRequestDto dto)
        {
            try
            {
                var id = await _shiftChangeRequestService.CreateRequestAsync(dto, User);
                return Ok(new { message = "Gửi đơn đổi ca thành công", id });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("my")]
        public async Task<IActionResult> GetMyRequests()
        {
            try
            {
                var requests = await _shiftChangeRequestService.GetMyRequestsAsync(User);
                return Ok(requests);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("pending")]
        [Authorize(Roles = "DepartmentHead,DepartmentManager,Admin,HrAdmin")]
        public async Task<IActionResult> GetPendingRequests()
        {
            try
            {
                // Admin gets all pending? Or just stick to Department Scope? 
                // Currently service limits to DepartmentId of the user.
                var requests = await _shiftChangeRequestService.GetPendingRequestsForDeptAsync(User);
                return Ok(requests);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("all")]
        [Authorize(Roles = "DepartmentHead,DepartmentManager,Admin,HrAdmin")]
        public async Task<IActionResult> GetAllRequestsForDept()
        {
            try
            {
                var requests = await _shiftChangeRequestService.GetAllRequestsForDeptAsync(User);
                return Ok(requests);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/approve")]
        [Authorize(Roles = "DepartmentHead,DepartmentManager,Admin,HrAdmin")]
        public async Task<IActionResult> ApproveRequest(int id)
        {
            try
            {
                await _shiftChangeRequestService.ApproveRequestAsync(id, User);
                return Ok(new { message = "Đã duyệt đơn đổi ca." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/reject")]
        [Authorize(Roles = "DepartmentHead,DepartmentManager,Admin,HrAdmin")]
        public async Task<IActionResult> RejectRequest(int id, [FromBody] RejectShiftChangeDto dto)
        {
            try
            {
                await _shiftChangeRequestService.RejectRequestAsync(id, dto.Reason, User);
                return Ok(new { message = "Đã từ chối đơn đổi ca." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
