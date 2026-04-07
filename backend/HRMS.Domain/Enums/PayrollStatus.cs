namespace HRMS.Domain.Enums
{
    /// <summary>
    /// Status for Payroll Calculation Period
    /// </summary>
    public enum PayrollStatus
    {
        Open = 1,           // Đang mở (đang tổng hợp công/tính toán)
        HR_Reviewing = 2,    // Đã tính toán, Trưởng bộ phận Payroll đang review
        Validated = 3,      // HR Manager/Admin đã phê duyệt
        Locked = 4,         // Đã chốt, không được sửa đổi
        Published = 5       // Đã công bố cho nhân viên xem
    }
}
