using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HRMS.Application.DTOs.Users
{
    public class UpdateUserRolesDto
    {
        [Required]
        public List<int> RoleIds { get; set; } = new List<int>();
    }
}
