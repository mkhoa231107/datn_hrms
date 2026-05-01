using System;

namespace HRMS.Application.DTOs.Scheduling
{
    public class SchedulePeriodDto
    {
        public int Id { get; set; }
        public string PeriodName { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsLocked { get; set; }
    }

    public class SchedulePeriodCreateDto
    {
        public string PeriodName { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int OrganizationId { get; set; }
    }
}

