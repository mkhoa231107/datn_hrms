using System;
using System.Collections.Generic;

namespace HRMS.Domain.Entities
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string PasswordHash { get; set; }
        public string Email { get; set; }
        public string FullName { get; set; } // Added FullName
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        public ICollection<UserRole> UserRoles { get; set; }
        public ICollection<AuditLog> AuditLogs { get; set; }
        
        // Employee relationship (1:1)
        public Employee Employee { get; set; }
    }
}
