using System;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Attendance Summary - Bảng tổng hợp chấm công cuối tháng
    /// </summary>
    public class AttendanceSummary
    {
        public int Id { get; set; }
        
        public int EmployeeId { get; set; }
        public Employee Employee { get; set; }
        
        public int PeriodId { get; set; }        // Kỳ công
        public SchedulePeriod Period { get; set; }
        
        public int TotalWorkingDays { get; set; }
        public decimal AdjustedWorkingDays { get; set; } // Sau khi trừ penalty đi trễ/về sớm (e.g. 19.5)
        public int LateDays { get; set; }        // Số ngày đi muộn
        public int EarlyLeaveDays { get; set; }  // Số ngày về sớm
        public int AbsentDays { get; set; }      // Số ngày vắng mặt
        
        public decimal TotalWorkingHours { get; set; }
        public decimal OvertimeHours { get; set; }
        
        // Approval Workflow
        public HRMS.Domain.Enums.TimesheetStatus Status { get; set; } = HRMS.Domain.Enums.TimesheetStatus.Draft;
        public int? ApprovedById { get; set; }
        public Employee? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
