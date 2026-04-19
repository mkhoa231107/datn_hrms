using System;

namespace HRMS.Domain.Entities
{
    public class OvertimeAssignment
    {
        public int Id { get; set; }
        
        public int? OvertimePlanId { get; set; }
        public OvertimePlan? OvertimePlan { get; set; }

        public int EmployeeId { get; set; }
        public Employee Employee { get; set; } = null!;

        public DateTime Date { get; set; }

        public decimal AssignedMaxHours { get; set; }

        public int AssignedById { get; set; }
        public Employee AssignedBy { get; set; } = null!;

        public bool IsNotified { get; set; } = false;
        public bool IsConfirmed { get; set; } = false;
        public DateTime? ConfirmedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
