using System;
using System.Collections.Generic;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Overtime Request - Đơn xin tăng ca của nhân viên hoặc thông báo từ trưởng bộ phận
    /// </summary>
    public class OvertimeRequest
    {
        public int Id { get; set; }
        
        public DateTime Date { get; set; }
        
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        
        public string? Reason { get; set; }
        
        public int DepartmentId { get; set; }
        public Department Department { get; set; }
        
        // Người làm đơn (Employee-initiated)
        public int EmployeeId { get; set; }
        public Employee Employee { get; set; }
        
        // Người duyệt đơn (DepartmentHead / Manager)
        public int? ApprovedById { get; set; }
        public Employee? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        
        // Status: Pending, Approved, Rejected, Cancelled
        public string Status { get; set; } = "Pending"; 
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public int CreatedById { get; set; } // Người tạo đơn (UserID)
        public string? Note { get; set; } // Phản hồi từ người duyệt
    }
}
