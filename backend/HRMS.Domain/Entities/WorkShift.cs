using System;
using System.Collections.Generic;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Work Shift category - Danh mục ca làm việc (Sáng/Chiều/Đêm)
    /// </summary>
    public class WorkShift
    {
        public int Id { get; set; }
        
        public string ShiftName { get; set; } // Tên ca: Sáng, Chiều, Đêm, Hành chính
        public string ShiftCode { get; set; } // Mã ca: HC, S1, C1, D1...
        
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        
        public int BreakMinutes { get; set; } // Thời gian nghỉ giữa ca
        public bool IsOvernight { get; set; } // Ca qua đêm
        public decimal OtMultiplier { get; set; } = 1.0m; // Hệ số tăng ca
        
        public int OrganizationId { get; set; }
        public Organization Organization { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation properties
        public ICollection<WorkSchedule> WorkSchedules { get; set; }
        public ICollection<DepartmentDefaultShift> DepartmentDefaultShifts { get; set; }
    }
}
