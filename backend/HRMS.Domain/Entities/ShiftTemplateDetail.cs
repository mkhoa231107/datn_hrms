using System;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Shift Template Detail - Chi tiết từng ngày trong mẫu ca
    /// </summary>
    public class ShiftTemplateDetail
    {
        public int Id { get; set; }
        
        public int ShiftTemplateId { get; set; }
        public ShiftTemplate ShiftTemplate { get; set; }
        
        public int DayNumber { get; set; } // Ngày thứ n trong chu kỳ (1, 2, 3...)
        
        public int? WorkShiftId { get; set; } // Null nếu là ngày nghỉ trong chu kỳ
        public WorkShift WorkShift { get; set; }
    }
}
