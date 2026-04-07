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
    }
}
