using System;

namespace HRMS.Domain.Entities
{
    public class EmployeeDocument
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public Employee Employee { get; set; }
        public string DocumentType { get; set; }   // "Bằng cấp", "Chứng chỉ", "Học vấn"
        public string Title { get; set; }           // Tên bằng / chứng chỉ
        public string? IssuedBy { get; set; }       // Nơi cấp
        public DateTime? IssuedDate { get; set; }   // Ngày cấp
        public DateTime? ExpiryDate { get; set; }   // Ngày hết hạn (nullable)
        public string? FileUrl { get; set; }        // URL file đính kèm
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
