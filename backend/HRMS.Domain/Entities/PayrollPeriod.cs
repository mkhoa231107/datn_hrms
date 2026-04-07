using System;
using System.Collections.Generic;
using HRMS.Domain.Enums;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Payroll Period - Kỳ lương (gắn với một kỳ công)
    /// Quản lý luồng phê duyệt bảng lương Master
    /// </summary>
    public class PayrollPeriod
    {
        public int Id { get; set; }
        
        public string Name { get; set; }    // Ví dụ: Lương tháng 5/2024
        
        public int SchedulePeriodId { get; set; }
        public SchedulePeriod SchedulePeriod { get; set; }
        
        public PayrollStatus Status { get; set; } = PayrollStatus.Open;
        
        // Tracking approvals
        public int? ProcessedById { get; set; } // Người thực hiện tính toán (Payroll Staff)
        public Employee? ProcessedBy { get; set; }
        
        public int? ReviewedById { get; set; }  // Người review/đối soát (HR-CB Manager)
        public Employee? ReviewedBy { get; set; }
        public DateTime? ReviewedAt { get; set; }
        
        public int? ApprovedById { get; set; }  // Người chốt cuối (HR Director/Admin)
        public Employee? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        public ICollection<PayrollRecord> Records { get; set; }
    }
}
