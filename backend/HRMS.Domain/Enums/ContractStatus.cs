using System;

namespace HRMS.Domain.Enums
{
    public enum ContractStatus
    {
        Draft = 0,             // Soạn thảo
        PendingAdmin = 3,      // Chờ Admin duyệt
        WaitingSign = 4,       // Chờ Nhân viên ký
        Active = 5,            // Đang hiệu lực
        Expired = 6,           // Đã hết hạn
        Terminated = 7         // Chấm dứt
    }
}
