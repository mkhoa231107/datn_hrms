using System;
using System.Collections.Generic;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Shift Template - Mẫu ca làm việc (Ví dụ: Ca xoay 2-2-2)
    /// </summary>
    public class ShiftTemplate
    {
        public int Id { get; set; }
        
        public string TemplateName { get; set; } // Tên mẫu: Ca xoay 2-2, Ca 3 kíp 4 tổ...
        public int CycleDays { get; set; } // Số ngày trong 1 chu kỳ (ví dụ: 6 ngày)
        
        public int OrganizationId { get; set; }
        public Organization Organization { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation properties
        public ICollection<ShiftTemplateDetail> Details { get; set; }
    }
}
