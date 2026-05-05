using System;
using System.IO;
using System.Threading.Tasks;
using HRMS.Application.DTOs.Contract;
using HRMS.Application.DTOs.Contracts;
using HRMS.Application.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;

namespace HRMS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Microsoft.AspNetCore.Authorization.Authorize] // Bỏ roles tổng để phân quyền theo action
    public class ContractsController : ControllerBase
    {
        private readonly IContractService _contractService;
        private readonly IWebHostEnvironment _env;

        public ContractsController(IContractService contractService, IWebHostEnvironment env)
        {
            _contractService = contractService;
            _env = env;
        }

        [HttpPost]
        public async Task<IActionResult> CreateContract([FromBody] ContractCreateDto dto)
        {
            try
            {
                var id = await _contractService.CreateContractAsync(dto);
                return Ok(new { message = "Thêm hợp đồng thành công", id });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{id}/export")]
        public async Task<IActionResult> ExportContract(int id)
        {
            try
            {
                // Template path: wwwroot/templates/thu_viec.docx
                // Future improvement: path = Path.Combine(_env.ContentRootPath, "wwwroot", "templates", $"{contractTypeName}.docx");
                string templatePath = Path.Combine(_env.ContentRootPath, "wwwroot", "templates", "thu_viec.docx");

                if (!System.IO.File.Exists(templatePath))
                {
                    return NotFound(new { message = "Không tìm thấy file mẫu hợp đồng." });
                }

                var (fileContent, fileName) = await _contractService.ExportContractToWordAsync(id, templatePath);

                return File(fileContent, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", fileName);
            }
            catch (FileNotFoundException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetContracts(
            [FromQuery] HRMS.Domain.Enums.ContractStatus? status, 
            [FromQuery] int? deptId,
            [FromQuery] bool personal = false)
        {
            try
            {
                var userRole = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;
                var userIdStr = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var employeeIdStr = User.Claims.FirstOrDefault(c => c.Type == "EmployeeId")?.Value;
                var deptIdStr = User.Claims.FirstOrDefault(c => c.Type == "DepartmentId")?.Value;
                var deptCode = User.Claims.FirstOrDefault(c => c.Type == "DepartmentCode")?.Value;
                
                if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId)) return Unauthorized();

                int? filterEmpId = null;
                int? filterDeptId = deptId; // Use explicitly provided deptId if present

                if (personal || userRole == "Employee")
                {
                    if (int.TryParse(employeeIdStr, out int empId) && empId > 0)
                    {
                        filterEmpId = empId;
                    }
                    else
                    {
                        filterEmpId = -1; // Prevent viewing others if no employee mapped
                    }
                    filterDeptId = null; // Ignore explicit deptId for personal view
                }
                else if (userRole == "DepartmentHead" || userRole == "DepartmentManager")
                {
                    // If not HR, restricted to their own department
                    if (!(userRole == "DepartmentManager" && (deptCode == "HR" || deptIdStr == "1"))) 
                    {
                        if (int.TryParse(deptIdStr, out int myDeptId))
                        {
                            filterDeptId = myDeptId;
                        }
                    }
                }

                var contracts = await _contractService.GetContractsAsync(filterEmpId, filterDeptId, status);
                return Ok(contracts);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống khi tải hợp đồng", detail = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,DepartmentManager,CnbSpecialist")]
        public async Task<IActionResult> UpdateContract(int id, [FromBody] ContractCreateDto dto)
        {
            try
            {
                await _contractService.UpdateContractAsync(id, dto);
                return Ok(new { message = "Cập nhật hợp đồng thành công" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/submit")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,DepartmentManager,CnbSpecialist")]
        public async Task<IActionResult> SubmitContract(int id)
        {
            try
            {
                // Only HR Manager or Admin can submit? Usually HR staff.
                // For now, let's just update the role restriction.
                await _contractService.SubmitContractAsync(id);
                return Ok(new { message = "Gửi duyệt hợp đồng thành công." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/approve")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,DepartmentManager,CnbSpecialist")]
        public async Task<IActionResult> ApproveContract(int id, [FromBody] ContractActionDto dto)
        {
            try
            {
                var userRole = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;
                var userIdStr = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var deptCode = User.Claims.FirstOrDefault(c => c.Type == "DepartmentCode")?.Value;

                if (!int.TryParse(userIdStr, out int approverId) || string.IsNullOrEmpty(userRole))
                    return Unauthorized();

                // If Manager, must be HR
                if (userRole == "DepartmentManager" && deptCode != "HR")
                {
                    return Forbid();
                }

                await _contractService.ApproveContractAsync(id, approverId, userRole, dto.Note);
                return Ok(new { message = "Đã duyệt hợp đồng." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/reject")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,DepartmentManager,CnbSpecialist")]
        public async Task<IActionResult> RejectContract(int id, [FromBody] ContractActionDto dto)
        {
            try
            {
                var userRole = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;
                var userIdStr = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var deptCode = User.Claims.FirstOrDefault(c => c.Type == "DepartmentCode")?.Value;

                if (!int.TryParse(userIdStr, out int rejectorId) || string.IsNullOrEmpty(userRole))
                    return Unauthorized();

                // If Manager, must be HR
                if (userRole == "DepartmentManager" && deptCode != "HR")
                {
                    return Forbid();
                }

                if (string.IsNullOrEmpty(dto.Reason))
                    return BadRequest(new { message = "Vui lòng nhập lý do từ chối." });

                await _contractService.RejectContractAsync(id, rejectorId, userRole, dto.Reason);
                return Ok(new { message = "Đã từ chối hợp đồng." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/sign")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Employee,DepartmentHead,DepartmentManager,Admin")]
        public async Task<IActionResult> SignContract(int id, [FromBody] ContractActionDto dto)
        {
            try
            {
                var userIdStr = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

                // Validation: Chỉ cho phép ký hợp đồng thuộc về mình (Can add inside service)

                if (string.IsNullOrEmpty(dto.Signature))
                    return BadRequest(new { message = "Vui lòng cung cấp chữ ký/xác nhận." });

                await _contractService.SignContractAsync(id, dto.Signature);
                return Ok(new { message = "Đã ký/xác nhận hợp đồng thành công." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpPost("bulk-create")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,DepartmentManager,CnbSpecialist")]
        public async Task<IActionResult> BulkCreate([FromBody] BulkContractCreateDto dto)
        {
            try
            {
                var userRole = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;
                var deptCode = User.Claims.FirstOrDefault(c => c.Type == "DepartmentCode")?.Value;

                // Only HR Manager or Admin
                if (userRole == "DepartmentManager" && deptCode != "HR")
                    return Forbid();

                await _contractService.BulkCreateContractsAsync(dto);
                return Ok(new { message = $"Tạo hàng loạt {dto.EmployeeIds.Count} hợp đồng thành công." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("batches")]
        public async Task<IActionResult> GetBatches()
        {
            var batches = await _contractService.GetBatchesAsync();
            return Ok(batches);
        }

        [HttpPost("batches")]
        public async Task<IActionResult> CreateBatch([FromBody] ContractBatchCreateDto dto)
        {
            var userIdStr = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();
            var id = await _contractService.CreateBatchAsync(dto, userId);
            return Ok(new { id });
        }

        [HttpGet("batches/{id}")]
        public async Task<IActionResult> GetBatchDetails(int id)
        {
            var details = await _contractService.GetBatchDetailsAsync(id);
            return Ok(details);
        }

        [HttpPut("batches/{id}/contracts")]
        public async Task<IActionResult> UpdateBatchContracts(int id, [FromBody] List<BatchContractItemUpdateDto> dto)
        {
            try
            {
                await _contractService.UpdateBatchContractsAsync(id, dto);
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message, detail = ex.InnerException?.Message });
            }
        }

        [HttpPost("batches/{id}/submit")]
        public async Task<IActionResult> SubmitBatch(int id)
        {
            await _contractService.SubmitBatchAsync(id);
            return Ok();
        }

        [HttpPost("renew-all")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,DepartmentManager,CnbSpecialist")]
        public async Task<IActionResult> RenewAll()
        {
            try
            {
                var userIdStr = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

                var batchId = await _contractService.RenewAllContractsAsync(userId);
                return Ok(new { message = "Đã khởi tạo đợt gia hạn hợp đồng cho toàn bộ nhân sự.", batchId });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
