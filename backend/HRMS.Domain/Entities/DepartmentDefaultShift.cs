using System;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Department Default Shift - Thiết lập ca mặc định cho từng phòng ban
    /// </summary>
    public class DepartmentDefaultShift
    {
        public int Id { get; set; }
        
        public int DepartmentId { get; set; }
        public Department Department { get; set; }
        
        public int WorkShiftId { get; set; }
        public WorkShift WorkShift { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
