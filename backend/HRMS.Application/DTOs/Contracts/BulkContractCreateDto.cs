using System;
using System.Collections.Generic;

namespace HRMS.Application.DTOs.Contract
{
    public class BulkContractCreateDto
    {
        public List<int> EmployeeIds { get; set; } = new List<int>();
        public int ContractTypeId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal BasicSalary { get; set; }
        public string JobDescription { get; set; } = string.Empty;
        public string WorkLocation { get; set; } = string.Empty;
        public string SignedBy { get; set; } = string.Empty;
        public DateTime? SignedDate { get; set; }
        public string? Notes { get; set; }
        /// <summary>Ca làm việc cố định ghi vào hợp đồng</summary>
        public int? ShiftId { get; set; }
    }
}


