using System;

namespace HRMS.Application.DTOs.Employees
{
    public class EmployeeContractDto
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public int ContractTypeId { get; set; }
        public string ContractNumber { get; set; }
        public string ContractType { get; set; }
        public string Status { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal BasicSalary { get; set; }
        public bool IsActive { get; set; }
        public string EmployeeName { get; set; }
        public string EmployeeCode { get; set; }
        public string DepartmentName { get; set; }
        public string IdentityNumber { get; set; }
        public string JobDescription { get; set; }
        public string WorkLocation { get; set; }
        public string? EmployeeSignature { get; set; }
        public DateTime? EmployeeSignedAt { get; set; }
        public string SignedBy { get; set; }
        public int? ContractBatchId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
