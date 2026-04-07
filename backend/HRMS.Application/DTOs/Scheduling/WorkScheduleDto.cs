using System;
using System.Collections.Generic;

namespace HRMS.Application.DTOs.Scheduling
{
    public class WorkScheduleDto
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string EmployeeFullName { get; set; }
        public string EmployeeCode { get; set; }
        public int? WorkShiftId { get; set; }
        public string ShiftCode { get; set; }
        public DateTime WorkingDate { get; set; }
    }

    public class WorkScheduleMatrixDto
    {
        public int EmployeeId { get; set; }
        public string FullName { get; set; }
        public string EmployeeCode { get; set; }
        public string PositionName { get; set; }
        public string DepartmentName { get; set; }
        public List<WorkScheduleDayDto> Schedules { get; set; } = new();
    }

    public class WorkScheduleDayDto
    {
        public DateTime Date { get; set; }
        public int? ShiftId { get; set; }
        public string ShiftCode { get; set; }
        public bool IsLocked { get; set; }
    }

    public class BulkAssignDto
    {
        public List<int> EmployeeIds { get; set; }
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
