using System;
using System.Collections.Generic;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Loại nghỉ phép (Phép năm, Nghỉ ốm, Thai sản...)
    /// </summary>
    public class LeaveType
    {
        public int Id { get; set; }
        public string Name { get; set; }            // VD: "Phép năm", "Nghỉ ốm"
        public string Code { get; set; }            // VD: "ANNUAL", "SICK"
        public string? Description { get; set; }
        public bool IsPaid { get; set; }            // Có hưởng lương không
        public int DefaultDaysPerYear { get; set; } // Số ngày phép mặc định/năm
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<LeaveRequest> LeaveRequests { get; set; }
        public ICollection<LeaveBalance> LeaveBalances { get; set; }
    }
}
