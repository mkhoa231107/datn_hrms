using HRMS.Application.DTOs.Employees;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HRMS.Application.Interfaces
{
    public interface IPositionService
    {
        Task<IEnumerable<PositionDto>> GetAllPositionsAsync();
    }
}
