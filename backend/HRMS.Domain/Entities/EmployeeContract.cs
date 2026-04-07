using System;
using HRMS.Domain.Enums;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Employee Contract - Hợp đồng lao động
    /// </summary>
    public class EmployeeContract
    {
        public int Id { get; set; }
        
        public int EmployeeId { get; set; }
        public Employee Employee { get; set; }
        
        public string ContractNumber { get; set; }  // Số hợp đồng
        public ContractType ContractType { get; set; }
        
        public DateTime StartDate { get; set; }     // Ngày bắt đầu
        public DateTime? EndDate { get; set; }      // Ngày kết thúc (null nếu vô thời hạn)
        
        public decimal BasicSalary { get; set; }    // Lương cơ bản
        public string JobDescription { get; set; }  // Mô tả công việc
        public string WorkLocation { get; set; }    // Địa điểm làm việc
        
        public bool IsActive { get; set; } = true;  // Hợp đồng còn hiệu lực
        public ContractStatus Status { get; set; } = ContractStatus.Draft;
        
        // Luồng phê duyệt
        public int? HrApprovedById { get; set; }
        public DateTime? HrApprovedAt { get; set; }
        
        public int? DeptHeadApprovedById { get; set; }
        public DateTime? DeptHeadApprovedAt { get; set; }
        
        public int? AdminApprovedById { get; set; }
        public DateTime? AdminApprovedAt { get; set; }
        
        public string? EmployeeSignature { get; set; }  // Có thể là hash signature hoặc link ảnh
        public DateTime? EmployeeSignedAt { get; set; } 
        
        public string? RejectReason { get; set; } // Lý do từ chối nếu có
        
        public string SignedBy { get; set; }        // Người đại diện công ty ký
        public DateTime? SignedDate { get; set; }   // Ngày ký của công ty
        
        public string? AttachmentUrl { get; set; }   // Link file pdf hợp đồng
        
        public int? ContractBatchId { get; set; }
        public ContractBatch? ContractBatch { get; set; }

        public string? Notes { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
