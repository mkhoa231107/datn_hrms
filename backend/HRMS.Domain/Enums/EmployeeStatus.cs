namespace HRMS.Domain.Enums
{
    /// <summary>
    /// Employment status of an employee
    /// </summary>
    public enum EmployeeStatus
    {
        Probation = 1,      // Thử việc
        Active = 2,         // Đang làm việc
        Resigned = 3,       // Đã nghỉ việc
        Terminated = 4,     // Bị sa thải
        Retired = 5         // Nghỉ hưu
    }
}
