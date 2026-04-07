namespace HRMS.Domain.Enums
{
    /// <summary>
    /// Status for Monthly Attendance Summary (Timesheet)
    /// </summary>
    public enum TimesheetStatus
    {
        Draft = 1,                      // Nháp
        PendingHeadApproval = 2,        // Chờ Trưởng bộ phận duyệt (Lần 1)
        PendingManagerApproval = 3,     // Chờ Trưởng phòng chốt (Lần 2)
        Approved = 4,                   // Đã chốt xong toàn bộ (Hoàn tất)
        Rejected = 5                    // Bị từ chối
    }
}
