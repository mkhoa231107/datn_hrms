using System;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Work Schedule - Lịch làm việc chi tiết của từng nhân viên theo ngày
    /// </summary>
    public class WorkSchedule
    {
        public int Id { get; set; }
        
        public int EmployeeId { get; set; }
        public Employee Employee { get; set; }
        
        public int? WorkShiftId { get; set; } // Null nếu là ngày nghỉ
        public WorkShift WorkShift { get; set; }
        
        public DateTime WorkingDate { get; set; }
        
        public int PeriodId { get; set; }
        public SchedulePeriod Period { get; set; }
        
        public string Note { get; set; } // Ghi chú (ví dụ: Tăng ca, ca gãy...)
        
        // Tổ trưởng phụ trách lịch này (Removed since sub-departments handle this)
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
