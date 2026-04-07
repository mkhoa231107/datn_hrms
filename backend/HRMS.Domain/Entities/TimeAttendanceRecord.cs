using System;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Time Attendance Record - Bảng dữ liệu chấm công thô (Check-in/Check-out)
    /// </summary>
    public class TimeAttendanceRecord
    {
        public int Id { get; set; }
        
        public int EmployeeId { get; set; }
        public Employee Employee { get; set; }
        
        public DateTime Timestamp { get; set; }  // Thời điểm check-in/out
        public string Type { get; set; }         // "CheckIn" hoặc "CheckOut"
        public string Location { get; set; }     // GPS hoặc tên thiết bị (optional)
        public string DeviceInfo { get; set; }   // Thông tin thiết bị chấm công
        
        public DateTime Date { get; set; }       // Ngày (extracted từ Timestamp)
        public int? WorkScheduleId { get; set; } // FK tới lịch làm việc đã gán
        public WorkSchedule WorkSchedule { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
