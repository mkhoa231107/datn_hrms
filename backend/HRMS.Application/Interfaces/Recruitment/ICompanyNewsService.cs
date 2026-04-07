using System.Collections.Generic;
using System.Threading.Tasks;
using HRMS.Application.DTOs.Recruitment;

namespace HRMS.Application.Interfaces.Recruitment
{
    public interface ICompanyNewsService
    {
        Task<IEnumerable<CompanyNewsDto>> GetAllNewsAsync(bool includeUnpublished = false);
        Task<CompanyNewsDto> GetNewsByIdAsync(int id);
        Task<CompanyNewsDto> CreateNewsAsync(int userId, CreateCompanyNewsDto dto);
        Task<CompanyNewsDto> UpdateNewsAsync(int id, int userId, CreateCompanyNewsDto dto);
        Task DeleteNewsAsync(int id, int userId);
    }
}
