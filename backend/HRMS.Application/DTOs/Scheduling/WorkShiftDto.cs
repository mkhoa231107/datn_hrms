using System;

namespace HRMS.Application.DTOs.Scheduling
{
    public class WorkShiftDto
    {
        public int Id { get; set; }
        public string ShiftName { get; set; } = string.Empty;
        public string ShiftCode { get; set; } = string.Empty;
        public string StartTime { get; set; } = string.Empty; // Format HH:mm
        public string EndTime { get; set; } = string.Empty;
        public int BreakMinutes { get; set; }
        public bool IsOvernight { get; set; }
        public decimal OtMultiplier { get; set; }
    }

    public class WorkShiftCreateDto
    {
        public string ShiftName { get; set; } = string.Empty;
        public string ShiftCode { get; set; } = string.Empty;
        public string StartTime { get; set; } = string.Empty;
        public string EndTime { get; set; } = string.Empty;
        public int BreakMinutes { get; set; }
        public bool IsOvernight { get; set; }
        public decimal OtMultiplier { get; set; } = 1.0m;
        public int OrganizationId { get; set; }
    }
}

