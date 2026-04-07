using System.Collections.Generic;

namespace HRMS.Application.DTOs.Scheduling
{
    public class ShiftTemplateDto
    {
        public int Id { get; set; }
        public string TemplateName { get; set; }
        public int CycleDays { get; set; }
        public List<ShiftTemplateDetailDto> Details { get; set; } = new();
    }

    public class ShiftTemplateDetailDto
    {
        public int DayNumber { get; set; }
        public int? WorkShiftId { get; set; }
        public string ShiftCode { get; set; }
    }

    public class ApplyTemplateDto
    {
        public int EmployeeId { get; set; }
        public int TemplateId { get; set; }
        public System.DateTime StartDate { get; set; }
        public int PeriodId { get; set; }
    }
}
