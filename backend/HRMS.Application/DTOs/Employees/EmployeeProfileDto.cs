using System;
using System.Collections.Generic;

namespace HRMS.Application.DTOs.Employees
{
    public class EmployeeProfileDto
    {
        // Thông tin cơ bản
        public int Id { get; set; }
        public string? EmployeeCode { get; set; }
        public string? FullName { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? PlaceOfOrigin { get; set; }
        public string? Ethnicity { get; set; }
        public string? Religion { get; set; }
        public string? Email { get; set; }
        public string? PersonalEmail { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? CurrentAddress { get; set; }
        public string? IdentityNumber { get; set; }
        public DateTime? IdentityDate { get; set; }
        public string? IdentityPlace { get; set; }
        public DateTime? IdentityExpirationDate { get; set; }
        public string? Avatar { get; set; }
        public bool IsActive { get; set; }
        public string? Signature { get; set; }
        
        // Thông tin công việc
        public DateTime JoinDate { get; set; }
        public string? Status { get; set; }
        public int DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public string? PositionName { get; set; }

        public decimal BasicSalary { get; set; }
        public decimal Coefficient { get; set; }
        public int? ShiftId { get; set; }
        public string? ShiftName { get; set; }
        
        // Cấu hình từ chức vụ
        public decimal? PositionBaseSalaryMin { get; set; }
        public decimal? PositionBaseSalaryMax { get; set; }
        public int? PositionDefaultShiftId { get; set; }
        
        // Dữ liệu liên quan
        public EmployeeContractDto? CurrentContract { get; set; }
        public List<EmployeeBankAccountDto> BankAccounts { get; set; } = new();
        public List<EmergencyContactDto> EmergencyContacts { get; set; } = new();
    }
}
