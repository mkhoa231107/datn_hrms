using System;

namespace HRMS.Application.DTOs.Contract
{
    public class ContractCreateDto
    {
        public string ContractNumber { get; set; } = string.Empty;
        public int EmployeeId { get; set; }
        public int ContractTypeId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal BasicSalary { get; set; }
        public string JobDescription { get; set; } = string.Empty;
        public string WorkLocation { get; set; } = string.Empty;
        public string SignedBy { get; set; } = string.Empty;
        public DateTime? SignedDate { get; set; }
        public string? Notes { get; set; }
    }
}
