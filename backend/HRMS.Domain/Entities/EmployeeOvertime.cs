namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Employee Overtime - Link table for OvertimeRequest and Employee
    /// </summary>
    public class EmployeeOvertime
    {
        public int OvertimeRequestId { get; set; }
        public OvertimeRequest OvertimeRequest { get; set; }
        
        public int EmployeeId { get; set; }
        public Employee Employee { get; set; }
    }
}
