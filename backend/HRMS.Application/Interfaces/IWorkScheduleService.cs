using System.Collections.Generic;
using System.Threading.Tasks;
using HRMS.Application.DTOs.Scheduling;

namespace HRMS.Application.Interfaces
{
    public interface IWorkScheduleService
    {
        // Matrix View
        Task<IEnumerable<WorkScheduleMatrixDto>> GetMatrixAsync(int periodId, System.Security.Claims.ClaimsPrincipal user, int? deptId);
        
        // Personal View
        Task<WorkScheduleMatrixDto> GetPersonalScheduleAsync(int periodId, System.Security.Claims.ClaimsPrincipal user);
        
        // Actions
        Task BulkAssignAsync(BulkAssignDto dto, System.Security.Claims.ClaimsPrincipal user);
        Task CopyPreviousMonthAsync(CopyScheduleDto dto, System.Security.Claims.ClaimsPrincipal user);
        Task ApplyTemplateAsync(ApplyTemplateDto dto, System.Security.Claims.ClaimsPrincipal user);
        Task<AutoScheduleResultDto> AutoScheduleDepartmentAsync(AutoScheduleDeptDto dto, System.Security.Claims.ClaimsPrincipal user);
        
        // Locking
        Task LockPeriodAsync(int periodId);
        Task UnlockPeriodAsync(int periodId);
        
        // Period Management
        Task<IEnumerable<SchedulePeriodDto>> GetPeriodsAsync(int organizationId);
        Task<int> CreatePeriodAsync(SchedulePeriodCreateDto dto);
        
        // Templates
        Task<IEnumerable<ShiftTemplateDto>> GetTemplatesAsync(int organizationId);
        
        // Contract-based auto-schedule
        Task<AutoScheduleResultDto> GenerateFromContractAsync(int? employeeId, int year, bool overwrite);
        
        // Restore expired shift changes back to contract shift
        Task<int> RestoreExpiredShiftChangesAsync();

        /// <summary>
        /// Sinh lịch làm việc toàn hệ thống dựa trên quy tắc:
        /// 1. Nhân viên (Staff): Lịch HC cố định.
        /// 2. Công nhân (PRD-ASS): Xoay ca 1, 2, 3 hàng tuần.
        /// </summary>
        Task<AutoScheduleResultDto> GenerateGlobalAutoScheduleAsync(int year, bool overwrite);
        
        // Get single schedule by date
        Task<WorkScheduleDayDto> GetByDateAsync(int employeeId, DateTime date);
    }
}
