namespace HRMS.Application.DTOs.Departments
{
    public class DepartmentUpdateDto
    {
        public string DepartmentName { get; set; }
        public string DepartmentCode { get; set; }
        public string Description { get; set; }
        public int? ParentDepartmentId { get; set; }
        public int? ManagerId { get; set; }
        public bool? IsActive { get; set; }
    }
}
