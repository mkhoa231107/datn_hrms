using System;
using System.Collections.Generic;

namespace HRMS.Application.DTOs.Scheduling
{
    public class WorkScheduleDto
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string EmployeeFullName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;
        public int? WorkShiftId { get; set; }
        public string ShiftCode { get; set; } = string.Empty;
        public DateTime WorkingDate { get; set; }
    }

    public class WorkScheduleMatrixDto
    {
        public int EmployeeId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;
        public string PositionName { get; set; } = string.Empty;
        public string DepartmentName { get; set; } = string.Empty;
        public List<WorkScheduleDayDto> Schedules { get; set; } = new();
    }

    public class WorkScheduleDayDto
    {
        public DateTime Date { get; set; }
        public int? ShiftId { get; set; }
        public string ShiftCode { get; set; } = string.Empty;
        public bool IsLocked { get; set; }
        public double OTHours { get; set; }
    }

    public class BulkAssignDto
    {
        public List<int> EmployeeIds { get; set; } = new();
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int? ShiftId { get; set; }
        public int PeriodId { get; set; }
    }

    public class CopyScheduleDto
    {
        public int SourcePeriodId { get; set; }
        public int TargetPeriodId { get; set; }
        public int? DepartmentId { get; set; }
    }
}

