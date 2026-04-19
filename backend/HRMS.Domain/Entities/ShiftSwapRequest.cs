using System;
using HRMS.Domain.Enums;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Đơn hoán đổi ca làm việc giữa 2 nhân viên
    /// </summary>
    public class ShiftSwapRequest
    {
        public int Id { get; set; }

        // Nhân viên A (Người đề nghị)
        public int EmployeeAId { get; set; }
        public Employee EmployeeA { get; set; }

        // Nhân viên B (Đối tác đổi ca)
        public int EmployeeBId { get; set; }
        public Employee EmployeeB { get; set; }

        // Thông tin hoán đổi
        public DateTime StartDate { get; set; }     // Từ ngày
        public DateTime EndDate { get; set; }       // Đến ngày
        
        public int? TargetShiftId { get; set; }     // Ca muốn đổi sang
        public WorkShift? TargetShift { get; set; }

        // Thông tin bổ sung
        public string Reason { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }

        // Quy trình phê duyệt & Chữ ký (Base64)
        public ShiftSwapRequestStatus Status { get; set; } = ShiftSwapRequestStatus.PendingPartner;

        public string? SignatureA { get; set; }       // Chữ ký Người làm đơn
        public DateTime? SignedAtA { get; set; }

        public string? SignatureB { get; set; }       // Chữ ký Người đồng ý đổi
        public DateTime? SignedAtB { get; set; }

        public int? ManagerId { get; set; }         // Trưởng bộ phận duyệt
        public Employee? Manager { get; set; }
        public string? SignatureManager { get; set; } // Chữ ký Trưởng bộ phận
        public DateTime? SignedAtManager { get; set; }

        public int? HRId { get; set; }              // Chuyên viên C&B (HR) xác nhận
        public Employee? HR { get; set; }
        public string? SignatureHR { get; set; }      // Chữ ký xác nhận của HR
        public DateTime? SignedAtHR { get; set; }

        public string? RejectReason { get; set; }

        // Lưu trữ đơn
        public string? PdfUrl { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
