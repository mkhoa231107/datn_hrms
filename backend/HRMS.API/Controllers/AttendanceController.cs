using HRMS.Application.DTOs.Attendance;
using HRMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace HRMS.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class AttendanceController : ControllerBase
    {
        private readonly IAttendanceService _attendanceService;

        public AttendanceController(IAttendanceService attendanceService)
        {
            _attendanceService = attendanceService;
        }

        private int GetEmployeeId()
        {
            var empIdClaim = User.FindFirst("EmployeeId")?.Value;
            if (string.IsNullOrEmpty(empIdClaim) || empIdClaim == "0")
                throw new UnauthorizedAccessException("Tài khoản của bạn không được liên kết với hồ sơ nhân viên để thực hiện chức năng này.");
            return int.Parse(empIdClaim);
        }

        private void ValidateDepartmentAccess(int targetDeptId)
        {
            if (User.IsInRole("Admin") || User.IsInRole("HrAdmin")) return;

            var userDeptIdStr = User.FindFirst("DepartmentId")?.Value;
            var userDeptCode = User.FindFirst("DepartmentCode")?.Value;

            if (userDeptCode == "HR") return; // HR role can see everyone by business rule

            if (int.TryParse(userDeptIdStr, out int userDeptId))
            {
                // Strict isolation: targetDeptId must match exactly (or sub-dept if hierarchy is implemented)
                if (userDeptId != targetDeptId)
                    throw new UnauthorizedAccessException("Bạn không có quyền truy cập dữ liệu của bộ phận này.");
            }
            else
            {
                throw new UnauthorizedAccessException("Không xác định được bộ phận của bạn.");
            }
        }

        /// <summary>
        /// Check-in cho ngày hôm nay
        /// </summary>
        [HttpPost("check-in")]
        public async Task<IActionResult> CheckIn([FromBody] CheckInDto dto)
        {
            try
            {
                dto.EmployeeId = GetEmployeeId();
                dto.Timestamp = DateTime.Now; // Server time
                
                var result = await _attendanceService.CheckInAsync(dto);
                return Ok(new { success = true, data = result, message = "Check-in thành công!" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        /// <summary>
        /// Check-out cho ngày hôm nay
        /// </summary>
        [HttpPost("check-out")]
        public async Task<IActionResult> CheckOut([FromBody] CheckOutDto dto)
        {
            try
            {
                dto.EmployeeId = GetEmployeeId();
                dto.Timestamp = DateTime.Now; // Server time
                
                var result = await _attendanceService.CheckOutAsync(dto);
                return Ok(new { success = true, data = result, message = "Check-out thành công!" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        /// <summary>
        /// Chấm công nhanh bằng máy quét mã vạch
        /// </summary>
        [HttpPost("scan-barcode")]
        [AllowAnonymous] // Cho phép quét từ máy trạm chung mà không cần login cá nhân
        public async Task<IActionResult> ScanBarcode([FromBody] ScanBarcodeDto dto)
        {
            try
            {
                if (string.IsNullOrEmpty(dto.EmployeeCode))
                    return BadRequest(new { success = false, message = "Mã nhân viên không được để trống." });

                var result = await _attendanceService.ScanAttendanceByCodeAsync(dto.EmployeeCode, dto.Location ?? "Barcode Scanner", dto.DeviceInfo ?? "Station 1");
                
                string action = result.Type == "CheckIn" ? "Vào ca" : "Tan ca";
                return Ok(new { 
                    success = true, 
                    data = result, 
                    message = $"Chấm công [{action}] thành công cho nhân viên: {result.EmployeeName}" 
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        /// <summary>
        /// Lấy lịch sử chấm công của tôi
        /// </summary>
        [HttpGet("my-records")]
        public async Task<IActionResult> GetMyRecords([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
        {
            try
            {
                var employeeId = GetEmployeeId();
                var records = await _attendanceService.GetMyAttendanceRecordsAsync(employeeId, fromDate, toDate);
                return Ok(new { success = true, data = records });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        /// <summary>
        /// Lấy tổng hợp công tháng của tôi
        /// </summary>
        [HttpGet("my-summary/{periodId}")]
        public async Task<IActionResult> GetMySummary(int periodId)
        {
            try
            {
                var employeeId = GetEmployeeId();
                var summary = await _attendanceService.GetMyAttendanceSummaryAsync(employeeId, periodId);
                return Ok(new { success = true, data = summary });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        /// <summary>
        /// Gửi yêu cầu điều chỉnh công (quên chấm/máy lỗi)
        /// </summary>
        [HttpPost("adjustment-request")]
        public async Task<IActionResult> CreateAdjustmentRequest([FromBody] CreateTimeAdjustmentRequestDto dto)
        {
            try
            {
                var employeeId = GetEmployeeId();
                var result = await _attendanceService.CreateAdjustmentRequestAsync(employeeId, dto);
                return Ok(new { success = true, data = result, message = "Gửi yêu cầu thành công!" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        /// <summary>
        /// Xem danh sách yêu cầu điều chỉnh của tôi
        /// </summary>
        [HttpGet("my-adjustment-requests")]
        public async Task<IActionResult> GetMyAdjustmentRequests()
        {
            try
            {
                var employeeId = GetEmployeeId();
                var requests = await _attendanceService.GetMyAdjustmentRequestsAsync(employeeId);
                return Ok(new { success = true, data = requests });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        // ==================== ADMIN/MANAGER ENDPOINTS ====================

        /// <summary>
        /// [ADMIN] Xem chấm công theo phòng ban và ngày
        /// </summary>
        [HttpGet("department/{departmentId}/date/{date}")]
        [Authorize(Roles = "Admin,DepartmentManager,DepartmentHead")]
        public async Task<IActionResult> GetDepartmentAttendance(int departmentId, string date)
        {
            try
            {
                // Parse date string manually to avoid timezone offset issues when ASP.NET Core parses DateTime from route
                if (!DateTime.TryParseExact(date, new[] { "yyyy-MM-dd", "yyyy/MM/dd", "dd-MM-yyyy", "dd/MM/yyyy" },
                        System.Globalization.CultureInfo.InvariantCulture,
                        System.Globalization.DateTimeStyles.None, out DateTime parsedDate))
                {
                    return BadRequest(new { success = false, message = "Định dạng ngày không hợp lệ. Vui lòng dùng yyyy-MM-dd." });
                }
                // Ensure it's treated as local date with no time component
                parsedDate = DateTime.SpecifyKind(parsedDate.Date, DateTimeKind.Local);

                ValidateDepartmentAccess(departmentId);
                var records = await _attendanceService.GetAttendanceRecordsByDepartmentAsync(departmentId, parsedDate);
                return Ok(new { success = true, data = records });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        /// <summary>
        /// [MANAGER] Duyệt yêu cầu điều chỉnh công
        /// </summary>
        [HttpPost("adjustment-request/{requestId}/approve")]
        [Authorize(Roles = "Admin,DepartmentManager,DepartmentHead")]
        public async Task<IActionResult> ApproveAdjustmentRequest(int requestId, [FromBody] ApprovalDto dto)
        {
            try
            {
                var approverId = GetEmployeeId();
                var success = await _attendanceService.ApproveAdjustmentRequestAsync(requestId, approverId, dto.Note);
                if (success)
                    return Ok(new { success = true, message = "Đã duyệt yêu cầu!" });
                else
                    return BadRequest(new { success = false, message = "Không thể duyệt yêu cầu này!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        /// <summary>
        /// [MANAGER] Từ chối yêu cầu điều chỉnh công
        /// </summary>
        [HttpPost("adjustment-request/{requestId}/reject")]
        [Authorize(Roles = "Admin,DepartmentManager,DepartmentHead")]
        public async Task<IActionResult> RejectAdjustmentRequest(int requestId, [FromBody] ApprovalDto dto)
        {
            try
            {
                var approverId = GetEmployeeId();
                var success = await _attendanceService.RejectAdjustmentRequestAsync(requestId, approverId, dto.Note);
                if (success)
                    return Ok(new { success = true, message = "Đã từ chối yêu cầu!" });
                else
                    return BadRequest(new { success = false, message = "Không thể từ chối yêu cầu này!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        /// <summary>
        /// [MANAGER] Xem danh sách bảng tổng hợp công của phòng ban
        /// </summary>
        [HttpGet("department/{departmentId}/timesheets/{periodId}")]
        [Authorize(Roles = "Admin,DepartmentManager,DepartmentHead")]
        public async Task<IActionResult> GetDepartmentTimesheets(int departmentId, int periodId)
        {
            try
            {
                ValidateDepartmentAccess(departmentId);
                var summaries = await _attendanceService.GetDepartmentTimesheetsAsync(departmentId, periodId);
                return Ok(new { success = true, data = summaries });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        /// <summary>
        /// [MANAGER/HEAD] Xem bảng lưới chấm công chi tiết của phòng ban
        /// </summary>
        [HttpGet("department/{departmentId}/grid/{periodId}")]
        [Authorize(Roles = "Admin,DepartmentManager,DepartmentHead")]
        public async Task<IActionResult> GetAttendanceGrid(int departmentId, int periodId)
        {
            try
            {
                ValidateDepartmentAccess(departmentId);
                var grid = await _attendanceService.GetDepartmentAttendanceGridAsync(departmentId, periodId);
                return Ok(new { success = true, data = grid });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        /// <summary>
        /// [MANAGER/HEAD] Duyệt công hoặc Chốt công (Tùy cấp độ hiện tại của bản ghi)
        /// </summary>
        [HttpPost("timesheet/{summaryId}/approve")]
        [Authorize(Roles = "Admin,DepartmentManager,DepartmentHead")]
        public async Task<IActionResult> ApproveTimesheet(int summaryId)
        {
            try
            {
                var approverId = GetEmployeeId();
                var isHead = User.IsInRole("DepartmentHead");
                var isManager = User.IsInRole("DepartmentManager");
                var isAdmin = User.IsInRole("Admin") || User.IsInRole("HrAdmin");
                
                var success = await _attendanceService.ApproveTimesheetAsync(summaryId, approverId, isHead, isManager, isAdmin);
                if (success)
                    return Ok(new { success = true, message = "Đã thực hiện thao tác thành công!" });
                else
                    return BadRequest(new { success = false, message = "Không thể thực hiện thao tác này tại thời điểm hiện tại!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        /// <summary>
        /// [MANAGER/HEAD] Duyệt nhanh/Chốt nhanh tất cả bảng tổng hợp công của bộ phận
        /// </summary>
        [HttpPost("department/{departmentId}/timesheets/{periodId}/approve-all")]
        [Authorize(Roles = "Admin,DepartmentManager,DepartmentHead")]
        public async Task<IActionResult> ApproveAllTimesheets(int departmentId, int periodId)
        {
            try
            {
                ValidateDepartmentAccess(departmentId);
                var approverId = GetEmployeeId();
                var isHead = User.IsInRole("DepartmentHead");
                var isManager = User.IsInRole("DepartmentManager");
                var isAdmin = User.IsInRole("Admin") || User.IsInRole("HrAdmin");
                
                var count = await _attendanceService.ApproveAllTimesheetsAsync(departmentId, periodId, approverId, isHead, isManager, isAdmin);
                return Ok(new { success = true, count, message = $"Đã thực hiện thao tác thành công cho {count} bản ghi công!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        // ==================== OVERTIME ENDPOINTS (Refactored) ====================

        /// <summary>
        /// [EMPLOYEE] Gửi đơn xin tăng ca (phải trước 1 ngày)
        /// </summary>
        [HttpPost("overtime/request")]
        public async Task<IActionResult> SubmitOvertimeRequest([FromBody] CreateOvertimeRequestDto dto)
        {
            try
            {
                var employeeId = GetEmployeeId();
                var result = await _attendanceService.SubmitOvertimeRequestAsync(employeeId, dto);
                return Ok(new { success = true, data = result, message = "Đã gửi đơn xin tăng ca thành công, đang chờ duyệt." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        /// <summary>
        /// [HEAD/MANAGER] Duyệt hoặc Từ chối đơn tăng ca
        /// </summary>
        [HttpPost("overtime/review")]
        [Authorize(Roles = "Admin,DepartmentHead,DepartmentManager")]
        public async Task<IActionResult> ReviewOvertimeRequest([FromBody] OvertimeReviewDto dto)
        {
            try
            {
                var approverId = GetEmployeeId();
                var success = await _attendanceService.ReviewOvertimeRequestAsync(dto.RequestId, approverId, dto.Status, dto.Note ?? "");
                if (success)
                    return Ok(new { success = true, message = $"Đã { (dto.Status == "Approved" ? "duyệt" : "từ chối") } đơn tăng ca." });
                
                return BadRequest(new { success = false, message = "Không tìm thấy đơn tăng ca hoặc thao tác thất bại." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        /// <summary>
        /// [HEAD/MANAGER] Xem danh sách đơn tăng ca chờ duyệt của bộ phận
        /// </summary>
        [HttpGet("overtime/pending/{departmentId}")]
        [Authorize(Roles = "Admin,DepartmentHead,DepartmentManager")]
        public async Task<IActionResult> GetPendingOvertime(int departmentId)
        {
            try
            {
                ValidateDepartmentAccess(departmentId);
                var results = await _attendanceService.GetOvertimeToApproveAsync(departmentId);
                return Ok(new { success = true, data = results });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        /// <summary>
        /// [HEAD/MANAGER] Xem lịch sử tăng ca của bộ phận
        /// </summary>
        [HttpGet("department/{departmentId}/overtime")]
        [Authorize(Roles = "Admin,DepartmentHead,DepartmentManager")]
        public async Task<IActionResult> GetDepartmentOvertime(int departmentId)
        {
            try
            {
                ValidateDepartmentAccess(departmentId);
                var results = await _attendanceService.GetOvertimeRequestsByDepartmentAsync(departmentId);
                return Ok(new { success = true, data = results });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        /// <summary>
        /// [EMPLOYEE] Xem danh sách đơn tăng ca của tôi
        /// </summary>
        [HttpGet("my-overtime")]
        public async Task<IActionResult> GetMyOvertime()
        {
            try
            {
                var employeeId = GetEmployeeId();
                var results = await _attendanceService.GetMyOvertimeRequestsAsync(employeeId);
                return Ok(new { success = true, data = results });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        /// <summary>
        /// [MANAGER] Tổng hợp dữ liệu công cho nhân viên (Chạy trước khi Chốt/Duyệt)
        /// </summary>
        [HttpPost("finalize/{periodId}")]
        [Authorize(Roles = "Admin,DepartmentManager,DepartmentHead")]
        public async Task<IActionResult> FinalizeAttendance(int periodId)
        {
            try
            {
                var count = await _attendanceService.GenerateSummariesAsync(periodId);
                if (count > 0)
                    return Ok(new { success = true, message = $"Đã tổng hợp dữ liệu công thành công cho {count} nhân viên!" });
                else
                    return BadRequest(new { success = false, message = "Không thể tổng hợp dữ liệu vì KHÔNG tìm thấy dữ liệu chấm công (Check-in) nào trong kỳ này. Vui lòng kiểm tra lại ngày bắt đầu/kết thúc của kỳ công." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        /// <summary>
        /// [ADMIN] Dọn dẹp dữ liệu công cũ (Trích xuất CSV và xoá thô)
        /// </summary>
        [HttpPost("cleanup-archive")]
        [Authorize(Roles = "Admin,HrAdmin")]
        public async Task<IActionResult> CleanupArchive([FromQuery] int month, [FromQuery] int year)
        {
            try
            {
                var filePath = await _attendanceService.ExportAndCleanupOldAttendanceAsync(month, year);
                return Ok(new { success = true, file = filePath, message = "Đã dọn dẹp và kết xuất thành công." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        /// <summary>
        /// [TEST] Tạo dữ liệu mẫu full công cho tháng 3/2026
        /// </summary>
        [HttpPost("seed-test-data")]
        [Authorize(Roles = "Admin,DepartmentManager,DepartmentHead")]
        public async Task<IActionResult> SeedTestData()
        {
            try
            {
                // Logic directly here for simplicity in testing
                var hrmsContext = (HRMS.Infrastructure.Data.HRMSDbContext)HttpContext.RequestServices.GetRequiredService<HRMS.Infrastructure.Data.HRMSDbContext>();
                
                var employees = await hrmsContext.Employees.ToListAsync();
                var startDate = new DateTime(2026, 3, 1);
                var endDate = new DateTime(2026, 3, 31);
                
                var existingRecords = await hrmsContext.TimeAttendanceRecords
                    .Where(r => r.Date >= startDate && r.Date <= endDate)
                    .ToListAsync();
                hrmsContext.TimeAttendanceRecords.RemoveRange(existingRecords);
                
                int count = 0;
                foreach (var emp in employees)
                {
                    for (var date = startDate; date <= endDate; date = date.AddDays(1))
                    {
                        if (date.DayOfWeek == DayOfWeek.Sunday) continue;

                        hrmsContext.TimeAttendanceRecords.Add(new HRMS.Domain.Entities.TimeAttendanceRecord
                        {
                            EmployeeId = emp.Id,
                            Date = date,
                            Timestamp = date.AddHours(8),
                            Type = "CheckIn",
                            Location = "Văn phòng (Dữ liệu mẫu)",
                            DeviceInfo = "System Seed",
                            CreatedAt = DateTime.UtcNow
                        });

                        hrmsContext.TimeAttendanceRecords.Add(new HRMS.Domain.Entities.TimeAttendanceRecord
                        {
                            EmployeeId = emp.Id,
                            Date = date,
                            Timestamp = date.AddHours(17),
                            Type = "CheckOut",
                            Location = "Văn phòng (Dữ liệu mẫu)",
                            DeviceInfo = "System Seed",
                            CreatedAt = DateTime.UtcNow
                        });
                        count += 2;
                    }
                }

                await hrmsContext.SaveChangesAsync();
                return Ok(new { success = true, message = $"Đã tạo {count} bản ghi chấm công mẫu cho {employees.Count} nhân viên trong tháng 3/2026." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi khi tạo dữ liệu mẫu: " + ex.Message });
            }
        }
    }

    public class ApprovalDto
    {
        public string Note { get; set; } = string.Empty;
    }
}
