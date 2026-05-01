using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HRMS.Application.Interfaces;
using HRMS.Application.DTOs.Employees;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Linq;
using System;
using System.IO;
using System.Collections.Generic;
using Microsoft.AspNetCore.Http;

namespace HRMS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class EmployeesController : ControllerBase
    {
        private readonly IEmployeeService _employeeService;
        private readonly HRMS.Infrastructure.Data.HRMSDbContext _context; // For debug access
        private readonly IHttpClientFactory _httpClientFactory;

        public EmployeesController(IEmployeeService employeeService, 
                                 HRMS.Infrastructure.Data.HRMSDbContext context,
                                 IHttpClientFactory httpClientFactory)
        {
            _employeeService = employeeService;
            _context = context;
            _httpClientFactory = httpClientFactory;
        }

        [AllowAnonymous]
        [HttpGet("debug-list")]
        public async Task<IActionResult> DebugList()
        {
            var count = await _context.Employees.CountAsync();
            var employees = await _context.Employees.Select(e => new { e.Id, e.FullName, e.EmployeeCode, e.UserId }).ToListAsync();
            return Ok(new { count, employees });
        }

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

        private void ValidateDepartmentAccess(int targetDeptId)
        {
            if (User.IsInRole("Admin") || User.IsInRole("CnbSpecialist")) return;

            var userDeptIdStr = User.FindFirst("DepartmentId")?.Value;
            var userDeptCode = User.FindFirst("DepartmentCode")?.Value;

            if (userDeptCode == "HR") return; // HR role can see everyone by business rule

            if (int.TryParse(userDeptIdStr, out int userDeptId))
            {
                if (userDeptId != targetDeptId)
                    throw new UnauthorizedAccessException("Bạn không có quyền truy cập dữ liệu của bộ phận này.");
            }
            else
            {
                throw new UnauthorizedAccessException("Không xác định được bộ phận của bạn.");
            }
        }

        // GET: api/employees/my-profile
        [HttpGet("my-profile")]
        public async Task<IActionResult> GetMyProfile()
        {
            try
            {
                var userId = GetUserId();
                var profile = await _employeeService.GetMyProfileAsync(userId);
                return Ok(profile);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/employees/{id}
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,DepartmentManager,DepartmentHead,CnbSpecialist")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var roles = User.FindAll(System.Security.Claims.ClaimTypes.Role).Select(c => c.Value).ToArray();
                var profile = await _employeeService.GetEmployeeProfileAsync(id, roles);
                
                // Security Check for Head/Manager
                if (profile != null)
                {
                    ValidateDepartmentAccess(profile.DepartmentId);
                }
                
                return Ok(profile);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT: api/employees/my-profile
        [HttpPut("my-profile")]
        public async Task<IActionResult> UpdateMyProfile([FromBody] EmployeeUpdateDto dto)
        {
            try
            {
                var userId = GetUserId();
                await _employeeService.UpdateMyProfileAsync(userId, dto);
                return Ok(new { message = "Cập nhật hồ sơ thành công" });
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT: api/employees/{id}
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,DepartmentManager")]
        public async Task<IActionResult> Update(int id, [FromBody] EmployeeUpdateDto dto)
        {
            try
            {
                await _employeeService.UpdateEmployeeAsync(id, dto);
                return Ok(new { message = "Cập nhật nhân viên thành công" });
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT: api/employees/{id}/payroll-overrides  — Override hệ số và phụ cấp riêng cho từng nhân viên
        [HttpPut("{id}/payroll-overrides")]
        [Authorize(Roles = "Admin,Accountant,CnbSpecialist")]
        public async Task<IActionResult> UpdateEmployeePayrollOverrides(int id, [FromBody] EmployeePayrollOverridesRequest request)
        {
            try
            {
                var employee = await _context.Employees.FindAsync(id);
                if (employee == null) return NotFound(new { message = "Không tìm thấy nhân viên" });
                employee.Coefficient = request.Coefficient;
                employee.MealAllowance = request.MealAllowance;
                employee.PhoneAllowance = request.PhoneAllowance;
                employee.PetrolAllowance = request.PetrolAllowance;
                employee.HousingAllowance = request.HousingAllowance;
                employee.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "Cập nhật thông tin lương nhân viên thành công" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/employees
        [HttpGet]
        [Authorize(Roles = "Admin,DepartmentManager,DepartmentHead,TeamLeader,Employee,CnbSpecialist,Accountant")]
        public async Task<IActionResult> GetAll([FromQuery] int? departmentId = null)
        {
            return await GetManagedUsers(departmentId);
        }

        // GET: api/employees/managed-users
        [HttpGet("managed-users")]
        [Authorize(Roles = "Admin,DepartmentManager,DepartmentHead,TeamLeader,Employee,CnbSpecialist,Accountant")]
        public async Task<IActionResult> GetManagedUsers([FromQuery] int? requestedDeptId = null)
        {
            try
            {
                int? departmentId = requestedDeptId;
                if (!User.IsInRole("Admin") && !User.IsInRole("CnbSpecialist"))
                {
                    var deptIdStr = User.FindFirst("DepartmentId")?.Value;
                    var deptCode = User.FindFirst("DepartmentCode")?.Value;

                    // Standard managers/heads are restricted to their own department
                    // EXCEPT if they are in HR (who can see everyone)
                    if (deptCode != "HR")
                    {
                        if (int.TryParse(deptIdStr, out int userDeptId) && userDeptId > 0)
                        {
                            // STRICK OVERRIDE: Forget what they requested, use their own DeptId
                            departmentId = userDeptId;
                        }
                    }
                }

                var employees = await _employeeService.GetAllEmployeesAsync(departmentId);
                return Ok(employees);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/employees
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] EmployeeCreateDto dto)
        {
            try
            {
                var id = await _employeeService.CreateEmployeeAsync(dto);
                return Ok(new { message = "Thêm nhân viên và tạo tài khoản thành công", id });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/employees/{id}/photo
        [HttpPost("{id}/photo")]
        [Authorize(Roles = "Admin,DepartmentManager")]
        public async Task<IActionResult> UploadPhoto(int id, IFormFile photo)
        {
            if (photo == null || photo.Length == 0)
                return BadRequest(new { message = "Vui lòng chọn file ảnh." });

            var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/webp" };
            if (!allowedTypes.Contains(photo.ContentType.ToLower()))
                return BadRequest(new { message = "Chỉ chấp nhận file ảnh (JPG, PNG, WebP)." });

            if (photo.Length > 5 * 1024 * 1024)
                return BadRequest(new { message = "File ảnh không được vượt quá 5MB." });

            try
            {
                var employee = await _context.Employees.FindAsync(id);
                if (employee == null) return NotFound(new { message = "Không tìm thấy nhân viên." });

                var uploadDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "employees");
                Directory.CreateDirectory(uploadDir);

                var ext = Path.GetExtension(photo.FileName).ToLower();
                var fileName = $"emp_{id}_{DateTime.UtcNow.Ticks}{ext}";
                var filePath = Path.Combine(uploadDir, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                    await photo.CopyToAsync(stream);

                if (!string.IsNullOrEmpty(employee.Avatar))
                {
                    var oldPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot",
                        employee.Avatar.TrimStart('/'));
                    if (System.IO.File.Exists(oldPath))
                        System.IO.File.Delete(oldPath);
                }

                employee.Avatar = $"/uploads/employees/{fileName}";
                employee.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return Ok(new { avatarUrl = employee.Avatar, message = "Tải ảnh lên thành công." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/employees/{id}/face-descriptor
        [HttpPost("{id}/face-descriptor")]
        [Authorize(Roles = "Admin,DepartmentManager")]
        public async Task<IActionResult> SaveFaceDescriptor(int id, [FromBody] FaceDescriptorDto dto)
        {
            try
            {
                await _employeeService.SaveFaceDescriptorAsync(id, dto.Descriptor);
                return Ok(new { message = "Đã lưu dữ liệu khuôn mặt thành công." });
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/employees/face-descriptors
        [HttpGet("face-descriptors")]
        public async Task<IActionResult> GetFaceDescriptors()
        {
            try
            {
                var descriptors = await _employeeService.GetAllFaceDescriptorsAsync();
                return Ok(descriptors);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/employees/proxy-image?url={url}
        [AllowAnonymous]
        [HttpGet("proxy-image")]
        public async Task<IActionResult> ProxyImage([FromQuery] string url)
        {
            if (string.IsNullOrEmpty(url)) return BadRequest("URL is required");

            try
            {
                var client = _httpClientFactory.CreateClient();
                var response = await client.GetAsync(url);

                if (!response.IsSuccessStatusCode)
                    return StatusCode((int)response.StatusCode, "Failed to fetch external image");

                var contentType = response.Content.Headers.ContentType?.ToString() ?? "image/jpeg";
                var imageBytes = await response.Content.ReadAsByteArrayAsync();

                return File(imageBytes, contentType);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error proxying image: " + ex.Message });
            }
        }
    }

    public class FaceDescriptorDto
    {
        public string Descriptor { get; set; } = string.Empty;
    }

    public class EmployeePayrollOverridesRequest
    {
        public decimal Coefficient { get; set; }
        public decimal? MealAllowance { get; set; }
        public decimal? PhoneAllowance { get; set; }
        public decimal? PetrolAllowance { get; set; }
        public decimal? HousingAllowance { get; set; }
    }
}
