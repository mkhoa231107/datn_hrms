using System;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Time Adjustment Request - Yêu cầu điều chỉnh công (quên chấm công/máy lỗi)
    /// </summary>
    public class TimeAdjustmentRequest
    {
        public int Id { get; set; }
        
        public int EmployeeId { get; set; }
        public Employee Employee { get; set; }
        
        public DateTime RequestedDate { get; set; }  // Ngày cần điều chỉnh
        public string Type { get; set; }             // "MissingCheckIn", "MissingCheckOut", "WrongTime"
        public string Reason { get; set; }           // Lý do
        
        public DateTime? OriginalCheckIn { get; set; }
        public DateTime? OriginalCheckOut { get; set; }
        public DateTime? CorrectedCheckIn { get; set; }
        public DateTime? CorrectedCheckOut { get; set; }
        
        public string Status { get; set; }           // "Pending", "Approved", "Rejected"
        public int? ApprovedBy { get; set; }         // Manager ID
        public DateTime? ApprovedAt { get; set; }
        public string ApprovalNote { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
