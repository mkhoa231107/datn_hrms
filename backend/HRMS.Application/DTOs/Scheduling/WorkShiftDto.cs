using System;

namespace HRMS.Application.DTOs.Scheduling
{
    public class WorkShiftDto
    {
        public int Id { get; set; }
        public string ShiftName { get; set; }
        public string ShiftCode { get; set; }
        public string StartTime { get; set; } // Format HH:mm
        public string EndTime { get; set; }
        public int BreakMinutes { get; set; }
        public bool IsOvernight { get; set; }
        public decimal OtMultiplier { get; set; }
    }

    public class WorkShiftCreateDto
    {
        public string ShiftName { get; set; }
        public string ShiftCode { get; set; }
        public string StartTime { get; set; }
        public string EndTime { get; set; }
        public int BreakMinutes { get; set; }
        public bool IsOvernight { get; set; }
        public decimal OtMultiplier { get; set; } = 1.0m;
        public int OrganizationId { get; set; }
    }
}
