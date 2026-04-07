using System;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Số dư ngày phép của nhân viên theo từng loại và năm
    /// </summary>
    public class LeaveBalance
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public int LeaveTypeId { get; set; }
        public int Year { get; set; }               // Năm áp dụng (VD: 2026)
        public double TotalDays { get; set; }       // Tổng số ngày phép được cấp
        public double UsedDays { get; set; }        // Số ngày đã dùng
        public double RemainingDays => TotalDays - UsedDays;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation
        public Employee Employee { get; set; }
        public LeaveType LeaveType { get; set; }
    }
}
