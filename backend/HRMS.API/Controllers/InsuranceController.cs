using HRMS.Application.DTOs.Insurance;
using HRMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace HRMS.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class InsuranceController : ControllerBase
    {
        private readonly IInsuranceService _insuranceService;

        public InsuranceController(IInsuranceService insuranceService)
        {
            _insuranceService = insuranceService;
        }

        [HttpGet("department/{departmentId}")]
        [Authorize(Roles = "Admin,DepartmentHead,CnbSpecialist")]
        public async Task<IActionResult> GetDepartmentInsurance(int departmentId)
        {
            try
            {
                var data = await _insuranceService.GetDepartmentInsuranceAsync(departmentId);
                return Ok(new { success = true, data });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        [HttpGet("employee/{employeeId}")]
        public async Task<IActionResult> GetEmployeeInsurance(int employeeId)
        {
            try
            {
                var data = await _insuranceService.GetEmployeeInsuranceAsync(employeeId);
                return Ok(new { success = true, data });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        [HttpPost("employee/{employeeId}")]
        [Authorize(Roles = "Admin,DepartmentHead,CnbSpecialist")]
        public async Task<IActionResult> UpdateEmployeeInsurance(int employeeId, [FromBody] UpdateEmployeeInsuranceDto dto)
        {
            try
            {
                var success = await _insuranceService.UpdateEmployeeInsuranceAsync(employeeId, dto);
                return success ? Ok(new { success = true, message = "Cập nhật thông tin bảo hiểm thành công!" }) 
                               : BadRequest(new { success = false, message = "Không thể cập nhật thông tin bảo hiểm." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        /// <summary>
        /// [EMPLOYEE] Tự đăng ký bảo hiểm tự nguyện
        /// </summary>
        [HttpPost("my")]
        public async Task<IActionResult> UpdateMyInsurance([FromBody] UpdateEmployeeInsuranceDto dto)
        {
            try
            {
                var empIdClaim = User.FindFirst("EmployeeId")?.Value;
                if (string.IsNullOrEmpty(empIdClaim) || empIdClaim == "0")
                    return Unauthorized(new { success = false, message = "Không xác định được nhân viên." });

                var employeeId = int.Parse(empIdClaim);
                
                // For self-update, we ONLY allow updating voluntary amount and notes? 
                // Or let them update if they want, but mandatory flags are usually set by system or HR.
                // However, the requested feature is "nv tự mình đăng ký bảo hiểm (không bắt buộc)".
                // So we should fetch existing mandatory flags and preserve them if employee tries to change them?
                // Or just trust the DTO if it's "voluntary".
                
                var existing = await _insuranceService.GetEmployeeInsuranceAsync(employeeId);
                if (existing != null)
                {
                    // Preserve mandatory flags set by HR/System
                    dto.IsSocialEnabled = existing.IsSocialEnabled;
                    dto.IsHealthEnabled = existing.IsHealthEnabled;
                    dto.IsUnemploymentEnabled = existing.IsUnemploymentEnabled;
                }
                else
                {
                    // Default to true if not yet set? User said mandatory is automatic.
                    dto.IsSocialEnabled = true;
                    dto.IsHealthEnabled = true;
                    dto.IsUnemploymentEnabled = true;
                }

                var success = await _insuranceService.UpdateEmployeeInsuranceAsync(employeeId, dto);
                return success ? Ok(new { success = true, message = "Đăng ký bảo hiểm tự nguyện thành công!" }) 
                               : BadRequest(new { success = false, message = "Không thể đăng ký bảo hiểm." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }
    }
}
