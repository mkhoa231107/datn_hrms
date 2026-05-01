using System;

namespace HRMS.Application.DTOs.Employees
{
    public class EmployeeContractDto
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public int ContractTypeId { get; set; }
        public string ContractNumber { get; set; } = string.Empty;
        public string ContractType { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal BasicSalary { get; set; }
        public decimal MealAllowance { get; set; }
        public decimal PhoneAllowance { get; set; }
        public decimal PetrolAllowance { get; set; }
        public decimal HousingAllowance { get; set; }
        public bool IsActive { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;
        public string DepartmentName { get; set; } = string.Empty;
        public string IdentityNumber { get; set; } = string.Empty;
        public string JobDescription { get; set; } = string.Empty;
        public string WorkLocation { get; set; } = string.Empty;
        public string? EmployeeSignature { get; set; }
        public DateTime? EmployeeSignedAt { get; set; }
        public string SignedBy { get; set; } = string.Empty;
        public int? ContractBatchId { get; set; }
        public DateTime CreatedAt { get; set; }
        
        // Personal Information
        public DateTime DateOfBirth { get; set; }
        public string Address { get; set; } = string.Empty;
        public string? CurrentAddress { get; set; }
        public DateTime? IdentityDate { get; set; }
        public string? IdentityPlace { get; set; }
        public string PositionName { get; set; } = string.Empty;
        public string? PlaceOfOrigin { get; set; }
        public string? PlaceOfBirth { get; set; }

        // Ca làm việc cố định ghi trong hợp đồng
        public int? ShiftId { get; set; }
        public string ShiftName { get; set; } = string.Empty;
        public string ShiftCode { get; set; } = string.Empty;
        public string ShiftTime { get; set; } = string.Empty;  // "07:30 - 16:30"
    }
}

