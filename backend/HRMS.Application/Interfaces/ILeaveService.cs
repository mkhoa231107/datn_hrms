using System.Collections.Generic;
using System.Threading.Tasks;
using HRMS.Application.DTOs.Leave;

namespace HRMS.Application.Interfaces
{
    public interface ILeaveService
    {
        // ===== Employee actions =====
        Task<LeaveRequestDto> CreateRequestAsync(int employeeId, LeaveRequestCreateDto dto);
        Task<IEnumerable<LeaveRequestDto>> GetMyRequestsAsync(int employeeId);
        Task<IEnumerable<LeaveBalanceDto>> GetMyBalancesAsync(int employeeId, int year);
        Task<bool> CancelRequestAsync(int requestId, int employeeId);

        // ===== Manager actions =====
        Task<IEnumerable<LeaveRequestDto>> GetDepartmentRequestsAsync(int departmentId);
        Task<IEnumerable<LeaveRequestDto>> GetRequestsToApproveAsync(int approverId, System.Security.Claims.ClaimsPrincipal user);
        Task<IEnumerable<LeaveRequestDto>> GetApprovalHistoryAsync(int approverId);
        Task<bool> ApproveRequestAsync(int requestId, int approverId, System.Security.Claims.ClaimsPrincipal user, string? note);
        Task<bool> RejectRequestAsync(int requestId, int approverId, System.Security.Claims.ClaimsPrincipal user, string? note);

        // ===== Reference data =====
        Task<IEnumerable<LeaveTypeDto>> GetLeaveTypesAsync();

        // ===== Export =====
        Task<byte[]> ExportLeaveToExcelAsync(int? departmentId, int? year);
    }
}
