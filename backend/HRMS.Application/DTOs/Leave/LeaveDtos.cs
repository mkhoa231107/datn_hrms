using System;
using HRMS.Domain.Enums;

namespace HRMS.Application.DTOs.Leave
{
    // ===== REQUEST DTOs =====

    /// <summary>Tạo đơn xin nghỉ</summary>
    public class LeaveRequestCreateDto
    {
        public int LeaveTypeId { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string? Reason { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? RequesterSignature { get; set; } // Base64 signature
        public string? AttachmentBase64 { get; set; }   // Optional Base64 file attachment
    }

    /// <summary>Duyệt / Từ chối đơn</summary>
    public class LeaveApprovalDto
    {
        public string? Note { get; set; }
        public string? ApproverSignature { get; set; } // Base64 signature
    }

    // ===== RESPONSE DTOs =====

    /// <summary>Thông tin đơn nghỉ trả về cho client</summary>
    public class LeaveRequestDto
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string? EmployeeName { get; set; }
        public string? EmployeeCode { get; set; }
        public string? EmployeePositionName { get; set; }
        public int? EmployeeDepartmentId { get; set; }
        public string? EmployeeDepartmentName { get; set; }
        public int LeaveTypeId { get; set; }
        public string? LeaveTypeName { get; set; }
        public bool IsPaid { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public double TotalDays { get; set; }
        public string? Reason { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? JobTitle { get; set; }
        public string? RequesterSignature { get; set; }
        public string? ApproverSignature { get; set; }
        public LeaveStatus Status { get; set; }
        public string StatusName => Status.ToString();
        public string? ApproverNote { get; set; }
        public string? ApproverName { get; set; }
        public string? AttachmentUrl { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>Số dư ngày phép của nhân viên</summary>
    public class LeaveBalanceDto
    {
        public int LeaveTypeId { get; set; }
        public string LeaveTypeName { get; set; } = string.Empty;
        public bool IsPaid { get; set; }
        public int Year { get; set; }
        public double TotalDays { get; set; }
        public double UsedDays { get; set; }
        public double RemainingDays { get; set; }
    }

    /// <summary>Thông tin loại phép</summary>
    public class LeaveTypeDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsPaid { get; set; }
        public int DefaultDaysPerYear { get; set; }
    }
}

