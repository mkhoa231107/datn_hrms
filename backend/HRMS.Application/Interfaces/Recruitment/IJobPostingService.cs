using System.Collections.Generic;
using System.Threading.Tasks;
using HRMS.Application.DTOs.Recruitment;

namespace HRMS.Application.Interfaces.Recruitment
{
    public interface IJobPostingService
    {
        Task<IEnumerable<JobPostingDto>> GetAllJobPostingsAsync(bool includeInactive = false);
        Task<JobPostingDto> GetJobPostingByIdAsync(int id);
        Task<JobPostingDto> CreateJobPostingAsync(int userId, CreateJobPostingDto dto);
        Task<JobPostingDto> UpdateJobPostingAsync(int id, int userId, CreateJobPostingDto dto);
        Task DeleteJobPostingAsync(int id, int userId);
        Task ToggleJobPostingStatusAsync(int id, int userId);
    }
}
