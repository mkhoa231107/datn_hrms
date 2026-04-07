using System.Collections.Generic;
using System.Threading.Tasks;
using HRMS.Application.DTOs.Employees;

namespace HRMS.Application.Interfaces
{
    public interface IEmployeeService
    {
        Task<EmployeeProfileDto> GetMyProfileAsync(int userId);
        Task<EmployeeProfileDto> GetEmployeeProfileAsync(int employeeId, string[]? requesterRoles = null);
        Task UpdateMyProfileAsync(int userId, EmployeeUpdateDto dto);
        Task UpdateEmployeeAsync(int id, EmployeeUpdateDto dto);
        Task<IEnumerable<EmployeeSummaryDto>> GetAllEmployeesAsync(int? departmentId = null);
        Task<int> CreateEmployeeAsync(EmployeeCreateDto dto);
        Task SaveFaceDescriptorAsync(int employeeId, string descriptor);
        Task<IEnumerable<FaceDescriptorResultDto>> GetAllFaceDescriptorsAsync();
    }

    public class FaceDescriptorResultDto
    {
        public int EmployeeId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Descriptor { get; set; }
    }
}
