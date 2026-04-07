namespace HRMS.Domain.Enums
{
    public enum LeaveStatus
    {
        Pending = 0,    // Chờ duyệt
        Approved = 1,   // Đã duyệt
        Rejected = 2,   // Từ chối
        Cancelled = 3   // Hủy bởi nhân viên
    }
}
