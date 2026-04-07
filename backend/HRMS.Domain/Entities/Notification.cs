using System;
using HRMS.Domain.Enums;

namespace HRMS.Domain.Entities
{
    public class Notification
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; } // The recipient
        public string Title { get; set; }
        public string Message { get; set; }
        public string Type { get; set; } // "Overtime", "Leave", "Adjustment", etc.
        public string Status { get; set; } // "Unread", "Read"
        public string? RelatedId { get; set; } // ID of the related object (optional)
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReadAt { get; set; }

        // Navigation
        public Employee Employee { get; set; }
    }
}
