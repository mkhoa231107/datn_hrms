using System;
using System.Collections.Generic;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Schedule Period - Kỳ công / Kỳ xếp ca (ví dụ: Tháng 5/2024)
    /// </summary>
    public class SchedulePeriod
    {
        public int Id { get; set; }
        
        public string PeriodName { get; set; } // Tên kỳ: Tháng 1/2024, Tháng 2/2024...
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsLocked { get; set; } = false; // Trạng thái khóa dữ liệu
        
        public int OrganizationId { get; set; }
        public Organization Organization { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation properties
        public ICollection<WorkSchedule> WorkSchedules { get; set; }
    }
}
