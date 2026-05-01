using System;

namespace HRMS.Application.DTOs.Attendance
{
    public class CheckInDto
    {
        public int? EmployeeId { get; set; }
        public DateTime? Timestamp { get; set; }
        public string? Location { get; set; }
        public string? DeviceInfo { get; set; }
        public string? Note { get; set; }
    }

    public class CheckOutDto
    {
        public int? EmployeeId { get; set; }
        public DateTime? Timestamp { get; set; }
        public string? Location { get; set; }
        public string? DeviceInfo { get; set; }
        public string? Note { get; set; }
    }

    public class ScanBarcodeDto
    {
        public string EmployeeCode { get; set; } = string.Empty;
        public string? Location { get; set; }
        public string? DeviceInfo { get; set; }
    }

    public class AttendanceRecordDto
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
        public string Type { get; set; } = string.Empty; // CheckIn/CheckOut
        public string Location { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string ShiftName { get; set; } = string.Empty;
        public TimeSpan? ShiftStartTime { get; set; }
        public TimeSpan? ShiftEndTime { get; set; }
        public TimeSpan? OTStartTime { get; set; }
        public TimeSpan? OTEndTime { get; set; }
    }

    public class AttendanceSummaryDto
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public int PeriodId { get; set; }
        public string PeriodName { get; set; } = string.Empty;
        public int TotalWorkingDays { get; set; }
        public decimal AdjustedWorkingDays { get; set; }  // Sau khi trừ penalty đi trễ/về sớm
        public int LateDays { get; set; }
        public int EarlyLeaveDays { get; set; }
        public int AbsentDays { get; set; }
        public decimal TotalWorkingHours { get; set; }
        public decimal OvertimeHours { get; set; }
        public string Status { get; set; } = string.Empty;
        public int? ApprovedById { get; set; }
        public string? ApproverName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public bool IsAdmin { get; set; }
    }

    public class TimeAdjustmentRequestDto
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public DateTime RequestedDate { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public DateTime? OriginalCheckIn { get; set; }
        public DateTime? OriginalCheckOut { get; set; }
        public DateTime? CorrectedCheckIn { get; set; }
        public DateTime? CorrectedCheckOut { get; set; }
        public string Status { get; set; } = string.Empty;
        public int? ApprovedBy { get; set; }
        public string ApproverName { get; set; } = string.Empty;
        public DateTime? ApprovedAt { get; set; }
        public string ApprovalNote { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class CreateTimeAdjustmentRequestDto
    {
        public DateTime RequestedDate { get; set; }
        public string Type { get; set; } = string.Empty; // MissingCheckIn, MissingCheckOut, WrongTime
        public string Reason { get; set; } = string.Empty;
        public DateTime? CorrectedCheckIn { get; set; }
        public DateTime? CorrectedCheckOut { get; set; }
    }

    public class CreateOvertimeRequestDto
    {
        public DateTime Date { get; set; }
        public string StartTime { get; set; } = string.Empty; // Change to string for easier model binding
        public string EndTime { get; set; } = string.Empty;   // Change to string for easier model binding
        public string Reason { get; set; } = string.Empty;
        public int? EmployeeId { get; set; } // If null, assumed for caller
    }

    public class OvertimeRequestDto
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string StartTime { get; set; } = string.Empty;
        public string EndTime { get; set; } = string.Empty;
        public decimal TotalHours { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? ApproverName { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class OvertimeReviewDto
    {
        public int RequestId { get; set; }
        public string Status { get; set; } = string.Empty; // Approved / Rejected
        public string? Note { get; set; }
    }

    public class AttendanceGridDto
    {
        public List<string> DateHeaders { get; set; } = new List<string>();
        public List<AttendanceGridRowDto> Rows { get; set; } = new List<AttendanceGridRowDto>();
    }

    public class AttendanceGridRowDto
    {
        public int SummaryId { get; set; }
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public List<decimal> DailyValues { get; set; } = new List<decimal>(); // 1, 0.5, 0
        public decimal TotalOT { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool IsAdmin { get; set; }
    }

    // --- New Overtime module DTOs ---

    public class CreateOvertimePlanDto
    {
        public int DepartmentId { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public decimal TotalBudgetHours { get; set; }
        public string? Description { get; set; }
    }

    public class OvertimePlanDto
    {
        public int Id { get; set; }
        public int DepartmentId { get; set; }
        public string DepartmentName { get; set; } = string.Empty;
        public int Month { get; set; }
        public int Year { get; set; }
        public decimal TotalBudgetHours { get; set; }
        public string? Description { get; set; }
        public string Status { get; set; } = string.Empty;
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class OvertimeAssignmentDto
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public decimal AssignedMaxHours { get; set; }
        public string AssignedBy { get; set; } = string.Empty;
        public bool IsConfirmed { get; set; }
    }

    public class BulkAssignOvertimeDto
    {
        public int? PlanId { get; set; }
        public List<AssignmentItemDto> Assignments { get; set; } = new List<AssignmentItemDto>();
    }

    public class AssignmentItemDto
    {
        public int EmployeeId { get; set; }
        public DateTime Date { get; set; }
        public decimal Hours { get; set; }
    }
}



