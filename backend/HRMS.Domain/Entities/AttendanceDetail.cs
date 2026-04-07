using System;

namespace HRMS.Domain.Entities
{
    public class AttendanceDetail
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public DateTime Date { get; set; }
        
        public int? WorkShiftId { get; set; }
        
        public TimeSpan? CheckInTime { get; set; }
        public TimeSpan? CheckOutTime { get; set; }
        
        public bool IsLate { get; set; }
        public bool IsEarlyLeave { get; set; }
        
        public decimal WorkingHours { get; set; }
        public decimal WorkingDays { get; set; } // 1.0, 0.5, 0
        public decimal OTHours { get; set; }
        
        public string Status { get; set; } = string.Empty; // "Đúng giờ", "Đi muộn", "Về sớm", "Trễ & Sớm", "Không có mặt"
        public string? Note { get; set; }
        
        public int CheckInCount { get; set; } = 0;
        public int CheckOutCount { get; set; } = 0;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        public Employee Employee { get; set; } = null!;
        public WorkShift? WorkShift { get; set; }
    }
}
