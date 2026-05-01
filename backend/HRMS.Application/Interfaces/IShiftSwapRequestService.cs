using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HRMS.Application.DTOs.ShiftSwap;
using HRMS.Domain.Entities;
using HRMS.Domain.Enums;

namespace HRMS.Application.Interfaces
{
    public interface IShiftSwapRequestService
    {
        Task<ShiftSwapRequestDto?> GetByIdAsync(int id);
        Task<IEnumerable<ShiftSwapRequest>> GetAllAsync();
        Task<IEnumerable<ShiftSwapRequestDto>> GetByEmployeeIdAsync(int employeeId);
        Task<IEnumerable<ShiftSwapRequestDto>> GetPendingApprovalsAsync(int approverId, List<string> roles);
        Task<IEnumerable<ShiftSwapRequestDto>> GetApprovalHistoryAsync(int approverId, List<string> roles);
        
        // Workflow actions
        Task<ShiftSwapRequest> CreateRequestAsync(int requesterId, ShiftSwapCreateDto dto);
        Task<ShiftSwapRequest> RespondAsPartnerAsync(int id, int partnerId, bool accepted, string? signatureB);
        Task<ShiftSwapRequest> ApproveByManagerAsync(int id, int managerId, bool approved, string? signatureManager, string? rejectReason);
        Task<ShiftSwapRequest> ConfirmByHRAsync(int id, int hrId, bool confirmed, string? signatureHR, string? rejectReason);
        
        Task<ShiftSwapRequest> CancelRequestAsync(int id, int requesterId);
        Task<byte[]> GeneratePdfAsync(int requestId);
    }

    public class ShiftSwapCreateDto
    {
        public int PartnerId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int TargetShiftId { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }
        public string SignatureA { get; set; } = string.Empty;
    }
}
