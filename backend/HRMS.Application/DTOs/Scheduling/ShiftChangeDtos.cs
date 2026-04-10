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
        public string Reason { get; set; }
    }

    /// <summary>
    /// DTO trả về thông tin đơn xin đổi ca
    /// </summary>
    public class ShiftChangeRequestDto
    {
        public int Id { get; set; }

        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; }
        public string EmployeeCode { get; set; }
        public string DepartmentName { get; set; }

        public int RequestedShiftId { get; set; }
        public string RequestedShiftName { get; set; }
        public string RequestedShiftCode { get; set; }
        public string RequestedShiftTime { get; set; } // "07:30 - 16:30"

        public int? CurrentShiftId { get; set; }
        public string CurrentShiftName { get; set; }

        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Reason { get; set; }

        public string Status { get; set; }           // "Pending" | "Approved" | "Rejected"
        public string StatusLabel { get; set; }      // "Chờ duyệt" | "Đã duyệt" | "Đã từ chối"

        public int? ApproverId { get; set; }
        public string ApproverName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string RejectReason { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// DTO Trưởng phòng dùng khi từ chối đơn
    /// </summary>
    public class RejectShiftChangeDto
    {
        public string Reason { get; set; }
    }
}
