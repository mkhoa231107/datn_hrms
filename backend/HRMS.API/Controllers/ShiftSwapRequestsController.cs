using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using HRMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HRMS.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ShiftSwapRequestsController : ControllerBase
    {
        private readonly IShiftSwapRequestService _swapService;

        public ShiftSwapRequestsController(IShiftSwapRequestService swapService)
        {
            _swapService = swapService;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _swapService.GetByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpGet("my")]
        public async Task<IActionResult> GetMyRequests()
        {
            var empId = GetCurrentEmployeeId();
            if (empId == 0) return Unauthorized();
            var result = await _swapService.GetByEmployeeIdAsync(empId);
            return Ok(result);
        }

        [HttpGet("pending-approvals")]
        public async Task<IActionResult> GetPendingApprovals()
        {
            var userId = GetCurrentEmployeeId();
            var roles = User.Claims.Where(c => c.Type == ClaimTypes.Role).Select(c => c.Value).ToList();
            var result = await _swapService.GetPendingApprovalsAsync(userId, roles);
            return Ok(result);
        }

        [HttpGet("approval-history")]
        public async Task<IActionResult> GetApprovalHistory()
        {
            var userId = GetCurrentEmployeeId();
            var roles = User.Claims.Where(c => c.Type == ClaimTypes.Role).Select(c => c.Value).ToList();
            var result = await _swapService.GetApprovalHistoryAsync(userId, roles);
            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create(ShiftSwapCreateDto dto)
        {
            try
            {
                var empId = GetCurrentEmployeeId();
                if (empId == 0) return Unauthorized();
                var result = await _swapService.CreateRequestAsync(empId, dto);
                return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/respond-partner")]
        public async Task<IActionResult> RespondPartner(int id, [FromBody] PartnerResponseDto dto)
        {
            try
            {
                var empId = GetCurrentEmployeeId();
                var result = await _swapService.RespondAsPartnerAsync(id, empId, dto.Accepted, dto.SignatureB);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/approve-manager")]
        public async Task<IActionResult> ApproveManager(int id, [FromBody] ManagerApprovalDto dto)
        {
            try
            {
                var empId = GetCurrentEmployeeId();
                var result = await _swapService.ApproveByManagerAsync(id, empId, dto.Approved, dto.SignatureManager, dto.RejectReason);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/confirm-hr")]
        public async Task<IActionResult> ConfirmHR(int id, [FromBody] HRConfirmationDto dto)
        {
            try
            {
                var empId = GetCurrentEmployeeId();
                var result = await _swapService.ConfirmByHRAsync(id, empId, dto.Confirmed, dto.SignatureHR, dto.RejectReason);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{id}/pdf")]
        public async Task<IActionResult> DownloadPdf(int id)
        {
            try
            {
                var pdfBytes = await _swapService.GeneratePdfAsync(id);
                return File(pdfBytes, "application/pdf", $"ShiftSwapRequest_{id}.pdf");
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private int GetCurrentEmployeeId()
        {
            // Helper to get employee ID from claims (User.Identity.Name or custom claim)
            // In this system, it seems employees are linked to Users.
            // I'll use the logic from existing controllers (getting via UserService or just finding from UserId)
            // For now, let's assume 'EmployeeId' claim exists or we find it.
            var empIdStr = User.FindFirst("EmployeeId")?.Value;
            if (int.TryParse(empIdStr, out var empId)) return empId;
            return 0; 
        }

        public class PartnerResponseDto { public bool Accepted { get; set; } public string? SignatureB { get; set; } }
        public class ManagerApprovalDto { public bool Approved { get; set; } public string? SignatureManager { get; set; } public string? RejectReason { get; set; } }
        public class HRConfirmationDto { public bool Confirmed { get; set; } public string? SignatureHR { get; set; } public string? RejectReason { get; set; } }
    }
}
