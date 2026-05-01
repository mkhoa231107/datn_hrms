using HRMS.Domain.Enums;

namespace HRMS.Application.DTOs.Insurance
{
    public class EmployeeInsuranceDto
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;
        public string? DepartmentName { get; set; }
        public EmployeeStatus Status { get; set; }
        
        public bool IsSocialEnabled { get; set; }
        public bool IsHealthEnabled { get; set; }
        public bool IsUnemploymentEnabled { get; set; }
        
        public bool IsHealthcareEnabled { get; set; }
        public decimal HealthcareAmount { get; set; }
        
        public bool IsLifeInsuranceEnabled { get; set; }
        public decimal LifeInsuranceAmount { get; set; }
        
        public decimal AdditionalInsuranceAmount { get; set; }
        public string? Note { get; set; }
    }

    public class UpdateEmployeeInsuranceDto
    {
        public bool IsSocialEnabled { get; set; }
        public bool IsHealthEnabled { get; set; }
        public bool IsUnemploymentEnabled { get; set; }
        public bool IsHealthcareEnabled { get; set; }
        public decimal HealthcareAmount { get; set; }
        public bool IsLifeInsuranceEnabled { get; set; }
        public decimal LifeInsuranceAmount { get; set; }
        public decimal AdditionalInsuranceAmount { get; set; }
        public string? Note { get; set; }
    }
}

