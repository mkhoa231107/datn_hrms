using System.Collections.Generic;
using System.Threading.Tasks;
using HRMS.Application.DTOs.Jobs;

namespace HRMS.Application.Interfaces
{
    public interface IJobService
    {
        Task<int> CreateJobAsync(int userId, JobCreateDto dto);
        Task<IEnumerable<JobResponseDto>> GetEmployeeTasksAsync(int userId);
        Task<IEnumerable<JobResponseDto>> GetManagerTasksAsync(int userId);
        Task<JobResponseDto> GetJobByIdAsync(int jobId, int currentUserId, bool isAdminOrHrAdmin);
        Task UpdateProgressAsync(int userId, int jobId, JobUpdateProgressDto dto);
        Task EvaluateJobAsync(int userId, int jobId, JobEvaluationDto dto);
    }
}
