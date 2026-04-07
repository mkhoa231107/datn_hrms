using System;
using System.Collections.Generic;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Contract Batch - Đợt tạo hợp đồng (ví dụ: Đợt tháng 5/2024)
    /// </summary>
    public class ContractBatch
    {
        public int Id { get; set; }
        
        public string BatchName { get; set; } // Tên đợt: Đợt Q2/2024, Đợt tuyển dụng tháng 6...
        public int Month { get; set; }
        public int Year { get; set; }
        public string? Description { get; set; }
        
        public ContractBatchStatus Status { get; set; } = ContractBatchStatus.Draft;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        public int CreatedById { get; set; }
        public User CreatedBy { get; set; }

        public ICollection<EmployeeContract> Contracts { get; set; } = new List<EmployeeContract>();
    }

    public enum ContractBatchStatus
    {
        Draft = 0,      // Đang soạn thảo
        Pending = 1,    // Đang chờ ký (tất cả HĐ trong đợt đã được gửi)
        Completed = 2   // Đã hoàn tất (tất cả HĐ đã được ký hoặc hết hạn)
    }
}
