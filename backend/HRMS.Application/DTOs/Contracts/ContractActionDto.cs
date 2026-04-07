using System;

namespace HRMS.Application.DTOs.Contract
{
    public class ContractActionDto
    {
        public int ContractId { get; set; }
        public string? Note { get; set; }     // Tùy chọn khi Approve
        public string? Reason { get; set; }   // Bắt buộc khi Reject
        public string? Signature { get; set; } // Khi User ký
    }
}
