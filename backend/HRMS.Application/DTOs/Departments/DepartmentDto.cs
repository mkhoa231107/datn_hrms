using System;

namespace HRMS.Application.DTOs.Departments
{
    public class DepartmentDto
    {
        public int Id { get; set; }
        public string DepartmentName { get; set; } = string.Empty;
        public string DepartmentCode { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int OrganizationId { get; set; }
        public int? ParentDepartmentId { get; set; }
        public string ParentDepartmentName { get; set; } = string.Empty;
        public int? ManagerId { get; set; }
        public string ManagerName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}

