using System.Collections.Generic;
using System.Threading.Tasks;
using HRMS.Application.DTOs.Departments;

namespace HRMS.Application.Interfaces
{
    public interface IDepartmentService
    {
        Task<IEnumerable<DepartmentDto>> GetAllDepartmentsAsync();
        Task<DepartmentDto> GetDepartmentByIdAsync(int id);
        Task<DepartmentDto> CreateDepartmentAsync(DepartmentCreateDto dto);
        Task<DepartmentDto> UpdateDepartmentAsync(int id, DepartmentUpdateDto dto);
        Task DeleteDepartmentAsync(int id);
    }
}
