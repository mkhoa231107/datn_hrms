using System;
using System.Collections.Generic;

namespace HRMS.Application.DTOs.Contracts
{
    public class ContractBatchDto
    {
        public int Id { get; set; }
        public string BatchName { get; set; } = string.Empty;
        public int Month { get; set; }
        public int Year { get; set; }
        public string? Description { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string CreatorName { get; set; } = string.Empty;
        public int ContractCount { get; set; }
    }

    public class ContractBatchCreateDto
    {
        public string BatchName { get; set; } = string.Empty;
        public int Month { get; set; }
        public int Year { get; set; }
        public string? Description { get; set; }
    }

    public class BatchContractItemUpdateDto
    {
        public int EmployeeId { get; set; }
        public int ContractTypeId { get; set; }
        public decimal BasicSalary { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string JobDescription { get; set; } = string.Empty;
        public string WorkLocation { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public string? AttachmentUrl { get; set; }
    }

    public class ContractBatchDetailDto : ContractBatchDto
    {
        public List<HRMS.Application.DTOs.Employees.EmployeeContractDto> Contracts { get; set; } = new();
    }
}


