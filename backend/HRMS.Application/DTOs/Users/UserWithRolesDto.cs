using System.Collections.Generic;

namespace HRMS.Application.DTOs.Users
{
    public class UserWithRolesDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public string? PositionName { get; set; }
        public List<RoleDto> Roles { get; set; } = new List<RoleDto>();
    }
}

