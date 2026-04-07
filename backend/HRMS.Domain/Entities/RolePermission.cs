using System;

namespace HRMS.Domain.Entities
{
    public class RolePermission
    {
        public int RoleId { get; set; }
        public int PermissionId { get; set; }
        public DateTime GrantedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Role Role { get; set; }
        public Permission Permission { get; set; }
    }
}
