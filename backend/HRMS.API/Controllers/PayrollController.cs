using HRMS.Application.DTOs.Payroll;
using HRMS.Application.Interfaces;
using HRMS.Application.DTOs.Notification;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
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
        private readonly IEmailService _emailService;
        private readonly INotificationService _notificationService;

        public PayrollController(IPayrollService payrollService, IEmailService emailService, INotificationService notificationService)
        {
            _payrollService = payrollService;
            _emailService = emailService;
            _notificationService = notificationService;
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

        // ===== NEW: Gửi phiếu lương qua email + tạo in-app notification =====
        [HttpPost("periods/{periodId}/send-payslips")]
        [Authorize(Roles = "Admin,CnbSpecialist,Accountant")]
        public async Task<IActionResult> SendPayslips(int periodId)
        {
            if (!IsCbProcessor()) return Forbid();
            try
            {
                var records = (await _payrollService.GetPayrollRecordsAsync(periodId)).ToList();
                if (!records.Any())
                    return BadRequest(new { success = false, message = "Không có bản ghi lương nào để gửi." });

                // Lấy thông tin kỳ lương
                var periods = (await _payrollService.GetPayrollPeriodsAsync()).ToList();
                var period = periods.FirstOrDefault(p => p.Id == periodId);
                var periodName = period?.Name ?? $"Kỳ {periodId}";

                int sent = 0, failed = 0;
                var failedList = new List<string>();

                foreach (var r in records)
                {
                    try
                    {
                        // 1. Gửi email nếu có email
                        if (!string.IsNullOrEmpty(r.EmployeeEmail))
                        {
                            var emailBody = BuildPayslipEmailHtml(r, periodName);
                            await _emailService.SendEmailAsync(
                                r.EmployeeEmail,
                                $"[HRMS Net] Phiếu lương {periodName}",
                                emailBody
                            );
                        }

                        // 2. Tạo in-app notification
                        if (r.EmployeeId > 0)
                        {
                            await _notificationService.CreateNotificationAsync(new CreateNotificationDto
                            {
                                EmployeeId = r.EmployeeId,
                                Title = $"PHIẾU LƯƠNG {periodName.ToUpper()}",
                                Message = $"Phiếu lương {periodName} đã có. Lương thực lĩnh: {r.NetSalary:N0}đ. Nhấn để xem chi tiết.",
                                Type = "Payslip",
                                RelatedId = periodId.ToString()
                            });
                        }
                        sent++;
                    }
                    catch (Exception ex)
                    {
                        failed++;
                        failedList.Add($"{r.EmployeeName}: {ex.Message}");
                    }
                }

                return Ok(new
                {
                    success = true,
                    sent,
                    failed,
                    failedList,
                    message = $"Đã gửi {sent} phiếu lương thành công. {(failed > 0 ? $"{failed} thất bại." : "")}"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        private static string BuildPayslipEmailHtml(PayrollRecordDto r, string periodName)
        {
            var bhTotal = r.SocialInsurance + r.HealthInsurance + r.UnemploymentInsurance;
            return $@"
<!DOCTYPE html>
<html><head><meta charset='utf-8'></head>
<body style='font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px'>
  <div style='max-width:580px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)'>
    <div style='background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 32px;color:#fff'>
      <h1 style='margin:0;font-size:22px;font-weight:800'>HRMS Net</h1>
      <p style='margin:8px 0 0;opacity:0.85;font-size:14px'>Phiếu lương {periodName}</p>
    </div>
    <div style='padding:28px 32px'>
      <p style='font-size:15px;color:#374151'>Xin chào <strong>{r.EmployeeName}</strong>,</p>
      <p style='color:#6b7280;font-size:14px'>Phiếu lương kỳ <strong>{periodName}</strong> của bạn đã được phát hành. Chi tiết như sau:</p>
      <table style='width:100%;border-collapse:collapse;margin:16px 0;font-size:14px'>
        <tr style='background:#f9fafb'><td style='padding:10px 12px;color:#6b7280;border-bottom:1px solid #e5e7eb'>Mã nhân viên</td><td style='padding:10px 12px;font-weight:600;text-align:right;border-bottom:1px solid #e5e7eb'>{r.EmployeeCode}</td></tr>
        <tr><td style='padding:10px 12px;color:#6b7280;border-bottom:1px solid #e5e7eb'>Ngày công thực tế</td><td style='padding:10px 12px;font-weight:600;text-align:right;border-bottom:1px solid #e5e7eb'>{r.ActualWorkingDays} ngày</td></tr>
        <tr style='background:#f9fafb'><td style='padding:10px 12px;color:#6b7280;border-bottom:1px solid #e5e7eb'>Lương theo công</td><td style='padding:10px 12px;font-weight:600;text-align:right;border-bottom:1px solid #e5e7eb'>{r.ActualWorkingSalary:N0}đ</td></tr>
        <tr><td style='padding:10px 12px;color:#6b7280;border-bottom:1px solid #e5e7eb'>Lương tăng ca (OT)</td><td style='padding:10px 12px;font-weight:600;text-align:right;border-bottom:1px solid #e5e7eb'>{r.OvertimePay:N0}đ</td></tr>
        <tr style='background:#f9fafb'><td style='padding:10px 12px;color:#6b7280;border-bottom:1px solid #e5e7eb'>Tổng phụ cấp</td><td style='padding:10px 12px;font-weight:600;text-align:right;border-bottom:1px solid #e5e7eb'>{r.TotalAllowances:N0}đ</td></tr>
        <tr><td style='padding:10px 12px;color:#dc2626;border-bottom:1px solid #e5e7eb'>BHXH/BHYT/BHTN (NV đóng)</td><td style='padding:10px 12px;font-weight:600;color:#dc2626;text-align:right;border-bottom:1px solid #e5e7eb'>-{bhTotal:N0}đ</td></tr>
        <tr style='background:#ede9fe'><td style='padding:14px 12px;color:#4f46e5;font-weight:700;font-size:15px'>LƯƠNG THỰC LĨNH</td><td style='padding:14px 12px;font-weight:800;color:#4f46e5;font-size:18px;text-align:right'>{r.NetSalary:N0}đ</td></tr>
      </table>
      <p style='color:#9ca3af;font-size:12px;margin-top:24px;border-top:1px solid #f3f4f6;padding-top:16px'>Email này được gửi tự động từ hệ thống HRMS Net. Vui lòng không trả lời email này.</p>
    </div>
  </div>
</body></html>";
        }
    }
}

