using System.Collections.Generic;
using System.Threading.Tasks;
using HRMS.Application.DTOs.Scheduling;

namespace HRMS.Application.Interfaces
{
    public interface IWorkShiftService
    {
        Task<IEnumerable<WorkShiftDto>> GetAllAsync(int organizationId);
        Task<WorkShiftDto> GetByIdAsync(int id);
        Task<int> CreateAsync(WorkShiftCreateDto dto);
        Task UpdateAsync(int id, WorkShiftCreateDto dto);
        Task DeleteAsync(int id);
        
        // Department Defaults
        Task SetDepartmentDefaultShiftAsync(int deptId, int shiftId);
        Task<WorkShiftDto> GetDepartmentDefaultShiftAsync(int deptId);
    }
}
