namespace HRMS.Application.DTOs.Auth
{
    public class UserDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string[] Roles { get; set; } = Array.Empty<string>();
        public int? DepartmentId { get; set; }
        public string DepartmentCode { get; set; } = string.Empty;
        public int? EmployeeId { get; set; }
        public string EmployeeCode { get; set; } = string.Empty;
        public string PositionName { get; set; } = string.Empty;
        public string DepartmentName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Signature { get; set; } = string.Empty;
    }
}

