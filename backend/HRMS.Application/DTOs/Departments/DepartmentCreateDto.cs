using System.ComponentModel.DataAnnotations;

namespace HRMS.Application.DTOs.Departments
{
    public class DepartmentCreateDto
    {
        [Required(ErrorMessage = "Vui lòng nhập tên phòng ban")]
        public string DepartmentName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng nhập mã phòng ban")]
        public string DepartmentCode { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng chọn đơn vị tổ chức")]
        public int OrganizationId { get; set; }

        public int? ParentDepartmentId { get; set; }
        
        public int? ManagerId { get; set; }
    }
}

