using System.Collections.Generic;
using System.Threading.Tasks;
using HRMS.Application.DTOs.Contract;
using HRMS.Application.DTOs.Contracts;

namespace HRMS.Application.Interfaces
{
    public interface IContractService
    {
        Task<int> CreateContractAsync(ContractCreateDto dto);
        Task<(byte[] FileContent, string FileName)> ExportContractToWordAsync(int contractId, string templatePath);
        
        // Workflow actions
        Task SubmitContractAsync(int contractId);
        Task ApproveContractAsync(int contractId, int approverId, string role, string? note = null);
        Task RejectContractAsync(int contractId, int rejectorId, string role, string reason);
        Task SignContractAsync(int contractId, string signature);
        
        // Batch Operations
        Task<int> CreateBatchAsync(ContractBatchCreateDto dto, int creatorId);
        Task<ContractBatchDetailDto> GetBatchDetailsAsync(int batchId);
        Task UpdateBatchContractsAsync(int batchId, List<BatchContractItemUpdateDto> contracts);
        Task SubmitBatchAsync(int batchId);
        Task<IEnumerable<ContractBatchDto>> GetBatchesAsync();
        
        Task BulkCreateContractsAsync(BulkContractCreateDto dto);
        
        // Query
        Task<IEnumerable<HRMS.Application.DTOs.Employees.EmployeeContractDto>> GetContractsAsync(int? employeeId = null, int? departmentId = null, HRMS.Domain.Enums.ContractStatus? status = null);
    }
}
