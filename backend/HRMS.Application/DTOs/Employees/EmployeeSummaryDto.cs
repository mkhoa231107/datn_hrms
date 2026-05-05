namespace HRMS.Application.DTOs.Employees
{
    public class EmployeeSummaryDto
    {
        public int Id { get; set; }
        public string EmployeeCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string PositionName { get; set; } = string.Empty;
        public int? PositionId { get; set; }
        public string DepartmentName { get; set; } = string.Empty;
        public int? DepartmentId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? PersonalEmail { get; set; }
        public string Phone { get; set; } = string.Empty;
        public string? Avatar { get; set; }               // URL ảnh thẻ nhân viên
        public bool HasFaceDescriptor { get; set; }       // Đã đăng ký khuôn mặt chưa
        
        public string? Gender { get; set; }
        public string? Ethnicity { get; set; }
        public string? Religion { get; set; }
        public string? IdentityNumber { get; set; }
        public bool IsActive { get; set; }
        public decimal Coefficient { get; set; }
    }
}



