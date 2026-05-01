using HRMS.Application.DTOs.Attendance;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HRMS.Application.Interfaces
{
    public interface IAttendanceService
    {
        // Check-in/Check-out operations
        Task<AttendanceRecordDto> CheckInAsync(CheckInDto dto);
        Task<AttendanceRecordDto> CheckOutAsync(CheckOutDto dto);
        
        // Attendance history
        Task<List<AttendanceRecordDto>> GetMyAttendanceRecordsAsync(int employeeId, DateTime? fromDate = null, DateTime? toDate = null);
        Task<AttendanceSummaryDto> GetMyAttendanceSummaryAsync(int employeeId, int periodId);
        
        // Time adjustment requests
        Task<TimeAdjustmentRequestDto> CreateAdjustmentRequestAsync(int employeeId, CreateTimeAdjustmentRequestDto dto);
        Task<List<TimeAdjustmentRequestDto>> GetMyAdjustmentRequestsAsync(int employeeId);
        
        // Admin/Manager functions (for future use)
        Task<List<AttendanceRecordDto>> GetAttendanceRecordsByDepartmentAsync(int departmentId, DateTime date);
        Task<bool> ApproveAdjustmentRequestAsync(int requestId, int approverId, string note);
        Task<bool> RejectAdjustmentRequestAsync(int requestId, int approverId, string note);
        
        // Timesheet Summary Approval
        Task<AttendanceReportSummaryDto> GetAttendanceSummaryReportAsync(string month, int? departmentId, int page, int limit);
        Task<List<AttendanceSummaryDto>> GetDepartmentTimesheetsAsync(int departmentId, int periodId);
        Task<AttendanceGridDto> GetDepartmentAttendanceGridAsync(int departmentId, int periodId);
        Task<bool> ApproveTimesheetAsync(int summaryId, int approverId, bool isHead = false, bool isManager = false, bool isAdmin = false);
        Task<int> ApproveAllTimesheetsAsync(int departmentId, int periodId, int approverId, bool isHead = false, bool isManager = false, bool isAdmin = false);
        Task<int> GenerateSummariesAsync(int periodId);

        // --- New Overtime Management Workflow ---
        Task<OvertimePlanDto> CreateOvertimePlanAsync(CreateOvertimePlanDto dto, int creatorUserId);
        Task<List<OvertimePlanDto>> GetOvertimePlansAsync(int? departmentId, int? month, int? year);
        Task<bool> BulkAssignOvertimeAsync(BulkAssignOvertimeDto dto, int assignerUserId);
        Task<List<OvertimeAssignmentDto>> GetMyOvertimeAssignmentsAsync(int employeeId, DateTime fromDate, DateTime toDate);
        Task<AttendanceGridDto> GetOvertimeAssignmentGridAsync(int departmentId, int month, int year);
        Task<bool> PublishOvertimePlanAsync(int planId, int userId);
        Task<bool> ConfirmOvertimeAssignmentAsync(int assignmentId, int employeeId);

        // Data Retention
        Task<string> ExportAndCleanupOldAttendanceAsync(int month, int year);

        // Barcode Scanning
        Task<AttendanceRecordDto> ScanAttendanceByCodeAsync(string employeeCode, string location, string deviceInfo);

        // Export Excel
        Task<byte[]> ExportTimesheetToExcelAsync(int departmentId, int periodId);
    }
}
