using HRMS.Application.DTOs.Employees;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HRMS.Application.Interfaces
{
    public interface IPositionService
    {
        Task<IEnumerable<PositionDto>> GetAllPositionsAsync();
        Task UpdateCoefficientAsync(int id, decimal coefficient);
        Task UpdateAllowancesAsync(int id, decimal meal, decimal phone, decimal petrol, decimal housing);
    }
}
