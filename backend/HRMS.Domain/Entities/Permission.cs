using System.Collections.Generic;

namespace HRMS.Domain.Entities
{
    public class Permission
    {
        public int Id { get; set; }
        public string PermissionName { get; set; }
        public string Resource { get; set; }
        public string Action { get; set; }
        public string Description { get; set; }

        // Navigation properties
        public ICollection<RolePermission> RolePermissions { get; set; }
    }
}
