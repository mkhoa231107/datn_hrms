using System;

namespace HRMS.Application.DTOs.Scheduling
{
    /// <summary>
    /// DTO nhân viên dùng để tạo đơn xin đổi ca
    /// </summary>
    public class CreateShiftChangeRequestDto
    {
        public int RequestedShiftId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO trả về thông tin đơn xin đổi ca
    /// </summary>
    public class ShiftChangeRequestDto
    {
        public int Id { get; set; }

        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;
        public string DepartmentName { get; set; } = string.Empty;

        public int RequestedShiftId { get; set; }
        public string RequestedShiftName { get; set; } = string.Empty;
        public string RequestedShiftCode { get; set; } = string.Empty;
        public string RequestedShiftTime { get; set; } = string.Empty; // "07:30 - 16:30"

        public int? CurrentShiftId { get; set; }
        public string? CurrentShiftName { get; set; }

        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Reason { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;           // "Pending" | "Approved" | "Rejected"
        public string StatusLabel { get; set; } = string.Empty;      // "Chờ duyệt" | "Đã duyệt" | "Đã từ chối"

        public int? ApproverId { get; set; }
        public string? ApproverName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string? RejectReason { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// DTO Trưởng phòng dùng khi từ chối đơn
    /// </summary>
    public class RejectShiftChangeDto
    {
        public string Reason { get; set; } = string.Empty;
    }
}



