using System;
using HRMS.Domain.Enums;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Đơn xin đổi ca làm việc — do nhân viên tạo, Trưởng phòng phê duyệt.
    /// </summary>
    public class ShiftChangeRequest
    {
        public int Id { get; set; }

        // Nhân viên gửi đơn
        public int EmployeeId { get; set; }
        public Employee Employee { get; set; }

        // Ca muốn đổi sang
        public int RequestedShiftId { get; set; }
        public WorkShift RequestedShift { get; set; }

        // Ca hiện tại của nhân viên (snapshot lúc tạo đơn)
        public int? CurrentShiftId { get; set; }
        public WorkShift CurrentShift { get; set; }

        // Thời gian áp dụng đổi ca
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }

        // Lý do
        public string Reason { get; set; }

        // Trạng thái xử lý
        public ShiftChangeRequestStatus Status { get; set; } = ShiftChangeRequestStatus.Pending;

        // Người duyệt (Trưởng phòng)
        public int? ApproverId { get; set; }
        public Employee Approver { get; set; }

        public DateTime? ApprovedAt { get; set; }

        // Lý do từ chối (nếu có)
        public string RejectReason { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
