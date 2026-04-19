namespace HRMS.Domain.Enums
{
    public enum ShiftChangeRequestStatus
    {
        Pending   = 0,  // Chờ duyệt
        Approved  = 1,  // Đã duyệt
        Rejected  = 2,  // Đã từ chối
        Completed = 3   // Đã kết thúc (ca đổi hết hiệu lực, đã khôi phục ca gốc)
    }
}
