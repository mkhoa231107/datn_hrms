using System.Collections.Generic;

namespace HRMS.Application.DTOs.Users
{
    public class UserWithRolesDto
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string FullName { get; set; }
        public bool IsActive { get; set; }
        public List<RoleDto> Roles { get; set; } = new List<RoleDto>();
    }
}
