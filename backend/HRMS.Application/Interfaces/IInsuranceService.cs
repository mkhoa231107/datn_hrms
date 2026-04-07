using HRMS.Application.DTOs.Insurance;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HRMS.Application.Interfaces
{
    public interface IInsuranceService
    {
        Task<List<EmployeeInsuranceDto>> GetDepartmentInsuranceAsync(int departmentId);
        Task<EmployeeInsuranceDto?> GetEmployeeInsuranceAsync(int employeeId);
        Task<bool> UpdateEmployeeInsuranceAsync(int employeeId, UpdateEmployeeInsuranceDto dto);
        Task<bool> RegisterMandatoryInsuranceAsync(int employeeId);
    }
}
