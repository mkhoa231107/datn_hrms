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
        public decimal DefaultCoefficient { get; set; }
        public decimal DefaultMealAllowance { get; set; }
        public decimal DefaultPhoneAllowance { get; set; }
        public decimal DefaultPetrolAllowance { get; set; }
        public decimal DefaultHousingAllowance { get; set; }
        public int? DefaultShiftId { get; set; }
    }
}
