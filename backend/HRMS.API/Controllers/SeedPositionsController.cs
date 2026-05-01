using HRMS.Infrastructure.Data;
using HRMS.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace HRMS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SeedPositionsController : ControllerBase
    {
        private readonly HRMSDbContext _context;

        public SeedPositionsController(HRMSDbContext context)
        {
            _context = context;
        }

        [HttpPost("run-role-permission-seed")]
        public async Task<IActionResult> RunRolePermissionSeed()
        {
            try
            {
                await HRMS.Infrastructure.Seeders.RolePermissionSeeder.SeedAsync(_context);
                return Ok(new { success = true, message = "Role permissions updated successfully." });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("run-seed")]
        public async Task<IActionResult> RunSeed()
        {
            try
            {
                // Ensure organization
                var org = await _context.Organizations.FirstOrDefaultAsync();
                if (org == null)
                {
                    org = new Organization { OrganizationName = "Công ty TNHH Demo", TaxCode = "0123456789" };
                    _context.Organizations.Add(org);
                    await _context.SaveChangesAsync();
                }

                // Prepare target shifts (assuming they usually fall into these names)
                var hcShift = await _context.WorkShifts.FirstOrDefaultAsync(s => s.ShiftName.Contains("Hành chính") || s.ShiftCode == "HC");
                var fixedShiftsMapping = new Dictionary<string, int?>();
                if (hcShift != null) fixedShiftsMapping["Hành chính"] = hcShift.Id;
                
                // Other shifts like "Ca luân phiên", "Linh hoạt" can be NULL because they are not fixed

                var positionsData = new List<PositionSeedConfig>
                {
                    // HR

                    // Marketing
                    new("Phòng Marketing", "Quản lý chung", "MKT", "Trưởng phòng Marketing", 20000000, 35000000, "Hành chính", 1),
                    new("Phòng Marketing", "Digital MKT", "MKT-DIG", "Trưởng nhóm Digital", 18000000, 28000000, "Hành chính", 2),
                    new("Phòng Marketing", "Digital MKT", "MKT-DIG", "Chuyên viên Ads/SEO/Content", 9000000, 16000000, "Hành chính", 3),
                    new("Phòng Marketing", "Sự kiện", "MKT-EVT", "Trưởng nhóm Sự kiện", 15000000, 22000000, "Hành chính", 2),
                    new("Phòng Marketing", "Sự kiện", "MKT-EVT", "Nhân viên điều phối sự kiện", 8000000, 14000000, "Linh hoạt/Event", 3),

                    // Kinh doanh
                    new("Kinh doanh", "Miền Bắc", "SALES-N", "Giám đốc khu vực (RSM)", 25000000, 45000000, "Hành chính", 1),
                    new("Kinh doanh", "Miền Bắc", "SALES-N", "Trưởng nhóm kinh doanh", 12000000, 18000000, "Linh hoạt", 2),
                    new("Kinh doanh", "Miền Bắc", "SALES-N", "Nhân viên kinh doanh", 6000000, 9000000, "Linh hoạt/Thị trường", 3),
                    new("Kinh doanh", "Miền Nam", "SALES-S", "Giám đốc khu vực (RSM)", 25000000, 45000000, "Hành chính", 1),
                    new("Kinh doanh", "Miền Nam", "SALES-S", "Trưởng nhóm kinh doanh", 12000000, 18000000, "Linh hoạt", 2),
                    new("Kinh doanh", "Miền Nam", "SALES-S", "Nhân viên kinh doanh", 6000000, 9000000, "Linh hoạt/Thị trường", 3),

                    // Sản xuất
                    new("Sản xuất", "Quản lý chung", "PRD", "Trưởng phòng Sản xuất", 30000000, 50000000, "Hành chính", 1),
                    new("Sản xuất", "Xưởng lắp ráp", "PRD-ASS", "Quản đốc/Xưởng trưởng", 20000000, 30000000, "Hành chính", 2),
                    new("Sản xuất", "Xưởng lắp ráp", "PRD-ASS", "Tổ trưởng/Ca trưởng", 10000000, 15000000, "Ca luân phiên", 3),
                    new("Sản xuất", "Xưởng lắp ráp", "PRD-ASS", "Công nhân lắp ráp", 5500000, 8000000, "Ca luân phiên", 4),
                    new("Sản xuất", "Quản lý chất lượng", "PRD-QA", "Trưởng nhóm QA/QC", 18000000, 28000000, "Hành chính", 2),
                    new("Sản xuất", "Quản lý chất lượng", "PRD-QA", "Nhân viên QA (Quy trình)", 10000000, 16000000, "Hành chính", 3),
                    new("Sản xuất", "Quản lý chất lượng", "PRD-QA", "Nhân viên QC (Kiểm hàng)", 7000000, 11000000, "Ca luân phiên", 3),

                };

                int deptCount = 0;
                int posCount = 0;

                foreach (var g in positionsData.GroupBy(p => p.DeptCode))
                {
                    var f = g.First();
                    var dept = await _context.Departments.FirstOrDefaultAsync(d => d.DepartmentCode == g.Key);
                    if (dept == null)
                    {
                        var deptName = f.SmallDeptName == "Quản lý chung" ? f.BigDeptName : $"{f.BigDeptName} - {f.SmallDeptName}";
                        dept = new Department { OrganizationId = org.Id, DepartmentCode = g.Key, DepartmentName = deptName };
                        _context.Departments.Add(dept);
                        await _context.SaveChangesAsync();
                        deptCount++;
                    }

                    foreach (var posData in g)
                    {
                        var posCode = posData.PositionName.Replace(" ", "").Replace("/", "").Replace("&", "").ToUpper();
                        if (posCode.Length > 20) posCode = posCode.Substring(0, 20);

                        var pos = await _context.Positions.FirstOrDefaultAsync(p => p.PositionName == posData.PositionName && p.DepartmentId == dept.Id);
                        if (pos == null)
                        {
                            pos = new Position 
                            { 
                                DepartmentId = dept.Id, 
                                PositionName = posData.PositionName,
                                PositionCode = posCode,
                                Level = posData.Level
                            };
                            _context.Positions.Add(pos);
                        }
                        
                        pos.BaseSalaryMin = posData.MinSalary;
                        pos.BaseSalaryMax = posData.MaxSalary;
                        
                        int? defaultShiftId = null;
                        if (posData.ShiftKey == "Hành chính") defaultShiftId = hcShift?.Id;
                        pos.DefaultShiftId = defaultShiftId;

                        posCount++;
                    }
                    await _context.SaveChangesAsync();
                }

                return Ok(new { success = true, message = $"Seeded/Updated {deptCount} departments and {posCount} positions." });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message, stack = ex.StackTrace });
            }
        }

        [HttpPost("run-structure-reset-seed")]
        public async Task<IActionResult> RunStructureResetSeed()
        {
            try
            {
                await HRMS.Infrastructure.Seeders.StructureResetSeeder.SeedAsync(_context);
                return Ok(new { success = true, message = "Structure reset seeded successfully." });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message, stack = ex.StackTrace });
            }
        }
    }

    public record PositionSeedConfig(
        string BigDeptName, 
        string SmallDeptName, 
        string DeptCode, 
        string PositionName, 
        decimal MinSalary, 
        decimal MaxSalary,
        string ShiftKey,
        int Level
    );
}
