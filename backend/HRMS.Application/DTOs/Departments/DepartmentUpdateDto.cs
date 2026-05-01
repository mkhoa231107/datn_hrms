namespace HRMS.Application.DTOs.Departments
{
    public class DepartmentUpdateDto
    {
        public string DepartmentName { get; set; } = string.Empty;
        public string DepartmentCode { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int? ParentDepartmentId { get; set; }
        public int? ManagerId { get; set; }
        public bool? IsActive { get; set; }
    }
}

