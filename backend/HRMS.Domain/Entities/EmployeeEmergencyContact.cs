using System;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Employee Emergency Contact - Liên hệ khẩn cấp
    /// </summary>
    public class EmployeeEmergencyContact
    {
        public int Id { get; set; }
        
        public int EmployeeId { get; set; }
        public Employee Employee { get; set; }
        
        public string ContactName { get; set; }     // Họ tên người liên hệ
        public string Relationship { get; set; }    // Quan hệ (Vợ/Chồng, Cha/Mẹ, Anh/Chị/Em...)
        public string Phone { get; set; }
        public string Address { get; set; }
        
        public bool IsPrimary { get; set; } = false; // Liên hệ chính
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
