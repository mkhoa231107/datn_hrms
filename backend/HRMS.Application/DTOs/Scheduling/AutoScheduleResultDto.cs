namespace HRMS.Application.DTOs.Scheduling
{
    public class AutoScheduleResultDto
    {
        public int ScheduledDays { get; set; }
        public int ScheduledEmployees { get; set; }
        public int SkippedDays { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}


