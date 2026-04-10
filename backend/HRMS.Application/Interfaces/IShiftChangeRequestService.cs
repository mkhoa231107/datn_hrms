using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using HRMS.Application.DTOs.Scheduling;

namespace HRMS.Application.Interfaces
{
    public interface IShiftChangeRequestService
    {
        /// <summary>Nhân viên tạo đơn xin đổi ca</summary>
        Task<int> CreateRequestAsync(CreateShiftChangeRequestDto dto, ClaimsPrincipal user);

        /// <summary>Nhân viên xem lịch sử đơn của mình</summary>
        Task<IEnumerable<ShiftChangeRequestDto>> GetMyRequestsAsync(ClaimsPrincipal user);

        /// <summary>Trưởng phòng xem tất cả đơn chờ duyệt của phòng ban</summary>
        Task<IEnumerable<ShiftChangeRequestDto>> GetPendingRequestsForDeptAsync(ClaimsPrincipal user);

        /// <summary>Trưởng phòng xem tất cả đơn (bao gồm đã xử lý) của phòng ban</summary>
        Task<IEnumerable<ShiftChangeRequestDto>> GetAllRequestsForDeptAsync(ClaimsPrincipal user);

        /// <summary>Trưởng phòng phê duyệt đơn — tự động update WorkSchedule</summary>
        Task ApproveRequestAsync(int requestId, ClaimsPrincipal approver);

        /// <summary>Trưởng phòng từ chối đơn</summary>
        Task RejectRequestAsync(int requestId, string reason, ClaimsPrincipal approver);
    }
}
