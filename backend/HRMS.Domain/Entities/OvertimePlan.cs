using System;
using System.Collections.Generic;

namespace HRMS.Domain.Entities
{
    public class OvertimePlan
    {
        public int Id { get; set; }
        public int DepartmentId { get; set; }
        public Department Department { get; set; } = null!;

        public int Month { get; set; }
        public int Year { get; set; }

        public decimal TotalBudgetHours { get; set; }
        public string? Description { get; set; }

        public string Status { get; set; } = "Draft"; // Draft, Published

        public int CreatedById { get; set; }
        public Employee CreatedBy { get; set; } = null!;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<OvertimeAssignment> Assignments { get; set; } = new List<OvertimeAssignment>();
    }
}
