using System;

namespace HRMS.Domain.Entities
{
    public class UserRole
    {
        public int UserId { get; set; }
        public int RoleId { get; set; }
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow; // Added to satisfy schema constraint

        // Navigation properties
        public User User { get; set; }
        public Role Role { get; set; }
    }
}
