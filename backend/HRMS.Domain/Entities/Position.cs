using System;
using System.Collections.Generic;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Position/Job Title entity - Chức danh/Chức vụ
    /// </summary>
    public class Position
    {
        public int Id { get; set; }
        
        public string PositionName { get; set; }  // Tên chức danh (VD: HR Manager, Software Engineer)
        public string PositionCode { get; set; }  // Mã chức danh
        public int Level { get; set; }            // Cấp bậc (1=Cao nhất, số càng lớn cấp càng thấp)
        public string? Description { get; set; }  // Nullable - Mô tả chức danh
        
        // Department relationship
        public int DepartmentId { get; set; }
        public Department Department { get; set; }
        
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // Setup configuration
        public decimal? BaseSalaryMin { get; set; } // Lương cơ bản thấp nhất
        public decimal? BaseSalaryMax { get; set; } // Lương cơ bản cao nhất
        public int? DefaultShiftId { get; set; }    // Ca làm việc cố định mặc định
        public WorkShift DefaultShift { get; set; }
        
        // Navigation properties
        public ICollection<Employee> Employees { get; set; }
    }
}
