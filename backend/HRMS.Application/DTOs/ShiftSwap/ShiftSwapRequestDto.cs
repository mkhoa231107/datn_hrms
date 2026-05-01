using System;

namespace HRMS.Application.DTOs.ShiftSwap
{
    /// <summary>
    /// DTO an toàn cho phản hồi API - tránh circular reference của EF entities
    /// </summary>
    public class ShiftSwapRequestDto
    {
        public int Id { get; set; }

        // IDs (luôn có)
        public int EmployeeAId { get; set; }
        public int EmployeeBId { get; set; }
        public int? ManagerId { get; set; }
        public int? HRId { get; set; }

        // Nhân viên A
        public EmployeeSwapDto? EmployeeA { get; set; }

        // Nhân viên B
        public EmployeeSwapDto? EmployeeB { get; set; }

        // Trưởng bộ phận
        public EmployeeSwapDto? Manager { get; set; }

        // Nhân sự
        public EmployeeSwapDto? HR { get; set; }

        // Thông tin đơn
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int? TargetShiftId { get; set; }
        public string? Reason { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }

        // Trạng thái
        public string Status { get; set; } = string.Empty;

        // Chữ ký
        public string? SignatureA { get; set; }
        public DateTime? SignedAtA { get; set; }
        public string? SignatureB { get; set; }
        public DateTime? SignedAtB { get; set; }
        public string? SignatureManager { get; set; }
        public DateTime? SignedAtManager { get; set; }
        public string? SignatureHR { get; set; }
        public DateTime? SignedAtHR { get; set; }

        // Từ chối
        public string? RejectReason { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    public class EmployeeSwapDto
    {
        public int Id { get; set; }
        public string? EmployeeCode { get; set; }
        public string? FullName { get; set; }
        public DepartmentSwapDto? Department { get; set; }
    }

    public class DepartmentSwapDto
    {
        public int Id { get; set; }
        public string? DepartmentName { get; set; }
        public int? ManagerId { get; set; }
    }
}


