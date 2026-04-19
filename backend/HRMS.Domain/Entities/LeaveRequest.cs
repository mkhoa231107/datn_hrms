using System;
using HRMS.Domain.Enums;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Đơn xin nghỉ phép của nhân viên
    /// </summary>
    public class LeaveRequest
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public int LeaveTypeId { get; set; }

        public DateTime FromDate { get; set; }      // Ngày bắt đầu nghỉ
        public DateTime ToDate { get; set; }        // Ngày kết thúc nghỉ
        public double TotalDays { get; set; }       // Tổng số ngày nghỉ
        public string? Reason { get; set; }         // Lý do xin nghỉ
        
        // Contact & Context Info for formal document
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? JobTitle { get; set; }       // Requester's title at time of request

        public LeaveStatus Status { get; set; } = LeaveStatus.Pending;

        // Approval Info & Signatures
        public int? ApproverId { get; set; }        // EmployeeId của người duyệt
        public string? RequesterSignature { get; set; } // Base64 signature
        public string? ApproverSignature { get; set; } // Base64 signature
        public string? AttachmentUrl { get; set; }   // Path to medical cert / proof
        public string? ApproverNote { get; set; }   // Ghi chú khi duyệt/từ chối
        public DateTime? ApprovedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation
        public Employee Employee { get; set; }
        public Employee Approver { get; set; }
        public LeaveType LeaveType { get; set; }
    }
}
