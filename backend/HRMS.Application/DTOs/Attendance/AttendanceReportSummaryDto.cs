using System.Collections.Generic;

namespace HRMS.Application.DTOs.Attendance
{
    public class AttendanceReportSummaryDto
    {
        public List<AttendanceReportItemDto> Items { get; set; } = new List<AttendanceReportItemDto>();
        public int TotalItems { get; set; }
        public int CurrentPage { get; set; }
        public int TotalPages { get; set; }
    }

    public class AttendanceReportItemDto
    {
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;
        public int DepartmentId { get; set; }
        public string DepartmentName { get; set; } = string.Empty;
        
        public decimal TotalWorkingDays { get; set; } // Ngày công chuẩn
        public decimal ActualWorkingDays { get; set; } // Ngày công thực tế
        public decimal TotalOvertimeHours { get; set; } // Giờ OT
        public decimal TotalLeaveDays { get; set; } // Nghỉ phép
        public int LateOrEarlyCount { get; set; } // Đi trễ/về sớm
        public decimal OnTimePercentage { get; set; } // Tỷ lệ đi làm đúng giờ
    }
}
