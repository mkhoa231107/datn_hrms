namespace HRMS.Domain.Enums
{
    public enum ShiftSwapRequestStatus
    {
        PendingPartner = 0,   // Chờ đối tác xác nhận (Nhân viên B)
        PendingManager = 1,   // Chờ Trưởng bộ phận duyệt
        PendingHR = 2,        // Chờ phòng Nhân sự (C&B) xác nhận
        Approved = 3,         // Đã duyệt hoàn tất và cập nhật lịch
        Rejected = 4,         // Đã từ chối (bởi B, TL, hoặc HR)
        Cancelled = 5         // Người làm đơn tự hủy
    }
}
