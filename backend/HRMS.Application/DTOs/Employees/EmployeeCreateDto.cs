using System;
using HRMS.Domain.Enums;

namespace HRMS.Application.DTOs.Employees
{
    public class EmployeeCreateDto
    {
        public string EmployeeCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public DateTime DateOfBirth { get; set; }
        public string Gender { get; set; } = string.Empty;
        public string? PlaceOfOrigin { get; set; }
        public string? Nationality { get; set; } = "Việt Nam";
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public DateTime JoinDate { get; set; }
        public int OrganizationId { get; set; }
        public int DepartmentId { get; set; }
        public int PositionId { get; set; }
        public EmployeeStatus Status { get; set; } = EmployeeStatus.Probation;
    }
}

