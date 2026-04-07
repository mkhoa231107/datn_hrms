namespace HRMS.Domain.Enums
{
    public enum TaskStatus
    {
        New = 1,            // Mới
        InProgress = 2,     // Đang làm
        PendingReview = 3,  // Chờ duyệt
        Completed = 4,      // Hoàn thành
        Overdue = 5         // Quá hạn
    }
}
