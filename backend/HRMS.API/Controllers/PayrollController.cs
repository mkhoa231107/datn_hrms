using HRMS.Application.DTOs.Payroll;
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
    public class PayrollController : ControllerBase
    {
        private readonly IPayrollService _payrollService;

        public PayrollController(IPayrollService payrollService)
        {
            _payrollService = payrollService;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        
        private int GetEmployeeId()
        {
            var empIdClaim = User.FindFirst("EmployeeId")?.Value;
            return string.IsNullOrEmpty(empIdClaim) ? 0 : int.Parse(empIdClaim);
        }

        private bool IsCbProcessor()
        {
            return User.IsInRole("CnbSpecialist") || User.IsInRole("Accountant");
        }

        // ==================== SETTINGS ====================

        [HttpGet("settings")]
        [Authorize(Roles = "Admin,CnbSpecialist,DepartmentManager,DepartmentHead,Accountant")]
        public async Task<IActionResult> GetSettings()
        {
            // Assuming OrgId = 1 for now, can be extracted from user claims if multi-org
            var settings = await _payrollService.GetCurrentSettingsAsync(1);
            return Ok(new { success = true, data = settings });
        }

        [HttpPost("settings")]
        [Authorize(Roles = "Admin,CnbSpecialist,DepartmentManager,DepartmentHead,Accountant")]
        public async Task<IActionResult> UpdateSettings([FromBody] PayrollSettingDto dto)
        {
            if (!IsCbProcessor()) return Forbid();
            await _payrollService.UpdateSettingsAsync(1, dto);
            return Ok(new { success = true, message = "Cập nhật cấu hình lương thành công!" });
        }

        // ==================== EMPLOYEE PROFILES ====================

        [HttpGet("employee-profiles")]
        [Authorize(Roles = "Admin,CnbSpecialist,DepartmentManager,DepartmentHead,Accountant")]
        public async Task<IActionResult> GetEmployeeProfiles([FromQuery] int? departmentId)
        {
            var profiles = await _payrollService.GetEmployeePayrollProfilesAsync(departmentId);
            return Ok(new { success = true, data = profiles });
        }

        // Enriched profiles with attendance data for pre-calculation display
        [HttpGet("employee-profiles-with-attendance")]
        [Authorize(Roles = "Admin,CnbSpecialist,DepartmentManager,DepartmentHead,Accountant")]
        public async Task<IActionResult> GetEmployeeProfilesWithAttendance([FromQuery] int departmentId, [FromQuery] int schedulePeriodId)
        {
            if (departmentId <= 0 || schedulePeriodId <= 0)
                return BadRequest(new { success = false, message = "Vui lòng chọn phòng ban và kỳ lương." });
            var profiles = await _payrollService.GetEmployeeProfilesWithAttendanceAsync(departmentId, schedulePeriodId);
            return Ok(new { success = true, data = profiles });
        }

        [HttpPut("employee-profiles/{employeeId}")]
        [Authorize(Roles = "Admin,CnbSpecialist,DepartmentManager,DepartmentHead,Accountant")]
        public async Task<IActionResult> UpdateEmployeeProfile(int employeeId, [FromBody] EmployeePayrollUpdateDto dto)
        {
            await _payrollService.UpdateEmployeePayrollProfileAsync(employeeId, dto);
            return Ok(new { success = true, message = "Cập nhật hồ sơ lương nhân viên thành công!" });
        }

        // ==================== PERIODS & PROCESSING ====================

        [HttpGet("periods")]
        public async Task<IActionResult> GetPeriods()
        {
            var periods = await _payrollService.GetPayrollPeriodsAsync();
            return Ok(new { success = true, data = periods });
        }

        [HttpPost("periods")]
        [Authorize(Roles = "Admin,CnbSpecialist,DepartmentManager,DepartmentHead,Accountant")]
        public async Task<IActionResult> CreatePeriod([FromBody] CreatePayrollPeriodDto dto)
        {
            if (!IsCbProcessor()) return Forbid();
            var result = await _payrollService.CreatePayrollPeriodAsync(dto);
            return Ok(new { success = true, data = result });
        }

        [HttpPost("periods/{periodId}/calculate")]
        [Authorize(Roles = "Admin,CnbSpecialist,DepartmentManager,DepartmentHead,Accountant")]
        public async Task<IActionResult> CalculatePayroll(int periodId)
        {
            if (!IsCbProcessor()) return Forbid();
            try {
                await _payrollService.CalculatePayrollAsync(periodId, GetUserId());
                return Ok(new { success = true, message = "Tính toán lương hoàn tất!" });
            } catch (Exception ex) {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("records/{recordId}/adjust")]
        [Authorize(Roles = "Admin,CnbSpecialist,DepartmentManager,DepartmentHead,Accountant")]
        public async Task<IActionResult> AdjustRecord(int recordId, [FromBody] AdjustPayrollRecordDto dto)
        {
            if (!IsCbProcessor()) return Forbid();
            await _payrollService.AdjustPayrollRecordAsync(recordId, dto);
            return Ok(new { success = true, message = "Điều chỉnh lương thành công!" });
        }

         [HttpPost("periods/{periodId}/review")]
        [Authorize(Roles = "Admin,CnbSpecialist,DepartmentManager,DepartmentHead,Accountant")] // Payroll Dept Head
        public async Task<IActionResult> ReviewPayroll(int periodId)
        {
            if (!IsCbProcessor()) return Forbid();
            await _payrollService.ReviewPayrollAsync(periodId, GetUserId());
            return Ok(new { success = true, message = "Đã xác nhận bảng lương (Review)!" });
        }

        [HttpPost("periods/{periodId}/approve")]
        [Authorize(Roles = "Admin,CnbSpecialist,DepartmentManager,DepartmentHead,Accountant")] // HR Director
        public async Task<IActionResult> ApprovePayroll(int periodId)
        {
            if (!IsCbProcessor()) return Forbid();
            await _payrollService.ApprovePayrollAsync(periodId, GetUserId());
            return Ok(new { success = true, message = "Đã phê duyệt và chốt bảng lương!" });
        }

        [HttpPost("periods/{periodId}/publish")]
        [Authorize(Roles = "Admin,CnbSpecialist,Accountant")]
        public async Task<IActionResult> PublishPayslips(int periodId)
        {
            if (!IsCbProcessor()) return Forbid();
            // Call a new method on IPayrollService
            await _payrollService.PublishPayslipsAsync(periodId, GetUserId());
            return Ok(new { success = true, message = "Đã gửi phiếu lương thành công!" });
        }

        // ==================== RECORDS ====================

        [HttpGet("periods/{periodId}/records")]
        [Authorize(Roles = "Admin,CnbSpecialist,DepartmentManager,DepartmentHead,Accountant")]
        public async Task<IActionResult> GetRecords(int periodId)
        {
            var records = await _payrollService.GetPayrollRecordsAsync(periodId);
            return Ok(new { success = true, data = records });
        }

         [HttpGet("my-payslip/{periodId}")]
        public async Task<IActionResult> GetMyPayslip(int periodId)
        {
            try {
                var employeeId = GetEmployeeId();
                var payslip = await _payrollService.GetMyPayslipAsync(employeeId, periodId);
                return Ok(new { success = true, data = payslip });
            } catch (Exception ex) {
                return NotFound(new { success = false, message = ex.Message });
            }
        }

        // ==================== NEW PROFESSIONAL WORKFLOW ====================

        [HttpPost("periods/{periodId}/employees")]
        [Authorize(Roles = "Admin,CnbSpecialist,DepartmentManager,DepartmentHead,Accountant")]
        public async Task<IActionResult> AddEmployeesToPayroll(int periodId, [FromBody] List<int> employeeIds)
        {
            if (!IsCbProcessor()) return Forbid();
            await _payrollService.AddEmployeesToPayrollAsync(periodId, employeeIds);
            return Ok(new { success = true, message = "Đã thêm nhân viên vào bảng lương thành công!" });
        }

        [HttpPost("periods/{periodId}/bulk-update")]
        [Authorize(Roles = "Admin,CnbSpecialist,DepartmentManager,DepartmentHead,Accountant")]
        public async Task<IActionResult> BulkUpdateRecords(int periodId, [FromBody] BulkUpdatePayrollRequest request)
        {
            if (!IsCbProcessor()) return Forbid();
            await _payrollService.BulkUpdateRecordsAsync(periodId, request);
            return Ok(new { success = true, message = "Đã lưu thay đổi hàng loạt!" });
        }

        [HttpPost("periods/{periodId}/aggregate")]
        [Authorize(Roles = "Admin,CnbSpecialist,DepartmentManager,DepartmentHead,Accountant")]
        public async Task<IActionResult> AggregatePayroll(int periodId)
        {
            if (!IsCbProcessor()) return Forbid();
            try {
                await _payrollService.AggregatePayrollAsync(periodId);
                return Ok(new { success = true, message = "Tổng hợp và tính toán lương hoàn tất!" });
            } catch (Exception ex) {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }



        // ===== NEW: Calculate payroll for selected employees =====
        [HttpPost("periods/{periodId}/calculate-for-employees")]
        [Authorize(Roles = "Admin,CnbSpecialist,DepartmentManager,DepartmentHead,Accountant")]
        public async Task<IActionResult> CalculateForEmployees(int periodId, [FromBody] CalculateForEmployeesDto dto)
        {
            if (!IsCbProcessor()) return Forbid();
            try {
                if (dto?.EmployeeIds == null || dto.EmployeeIds.Count == 0)
                    return BadRequest(new { success = false, message = "Vui lòng chọn ít nhất 1 nhân viên." });
                await _payrollService.CalculatePayrollForEmployeesAsync(periodId, dto.EmployeeIds, GetUserId());
                return Ok(new { success = true, message = $"Tính lương thành công cho {dto.EmployeeIds.Count} nhân viên!" });
            } catch (Exception ex) {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
    }
}
