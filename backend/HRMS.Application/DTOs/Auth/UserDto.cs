namespace HRMS.Application.DTOs.Auth
{
    public class UserDto
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string FullName { get; set; }
        public string[] Roles { get; set; }
        public int? DepartmentId { get; set; }
        public string DepartmentCode { get; set; }
        public int? EmployeeId { get; set; }
    }
}
