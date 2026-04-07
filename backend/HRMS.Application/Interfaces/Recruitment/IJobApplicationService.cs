using System.Collections.Generic;
using System.Threading.Tasks;
using HRMS.Application.DTOs.Recruitment;
using HRMS.Domain.Enums;

namespace HRMS.Application.Interfaces.Recruitment
{
    public interface IJobApplicationService
    {
        Task<IEnumerable<JobApplicationDto>> GetApplicationsByJobIdAsync(int jobId);
        Task<JobApplicationDto> GetApplicationByIdAsync(int id);
        Task<JobApplicationDto> CreateApplicationAsync(int? userId, CreateJobApplicationDto dto);
        Task UpdateApplicationStatusAsync(int id, int userId, ApplicationStatus newStatus);
        Task<IEnumerable<JobApplicationDto>> GetApplicationsByCandidateAsync(int userId);
        Task<JobApplicationDto> ScreenApplicationAsync(int id);
    }
}
