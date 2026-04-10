using System;

namespace HRMS.Application.DTOs.Employees
{
    public class PositionDto
    {
        public int Id { get; set; }
        public string PositionName { get; set; } = string.Empty;
        public string PositionCode { get; set; } = string.Empty;
        public int DepartmentId { get; set; }
        public int Level { get; set; }
        
        // Metadata for contract auto-filling
        public decimal? BaseSalaryMin { get; set; }
        public decimal? BaseSalaryMax { get; set; }
        public int? DefaultShiftId { get; set; }
    }
}
