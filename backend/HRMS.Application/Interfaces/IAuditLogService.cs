using HRMS.Application.DTOs.Audit;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HRMS.Application.Interfaces
{
    public interface IAuditLogService
    {
        Task<IEnumerable<AuditLogDto>> GetDepartmentActivitiesAsync(int departmentId);
        Task<IEnumerable<AuditLogDto>> GetRecentLogsAsync(int count = 50);
    }
}
