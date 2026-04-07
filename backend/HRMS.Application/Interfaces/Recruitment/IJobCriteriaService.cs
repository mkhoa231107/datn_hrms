using HRMS.Application.DTOs.Recruitment;
using System.Threading.Tasks;

namespace HRMS.Application.Interfaces.Recruitment
{
    public interface IJobCriteriaService
    {
        Task<JobCriteriaDto> GetByJobPostingIdAsync(int jobPostingId);
        Task<JobCriteriaDto> UpsertCriteriaAsync(UpsertJobCriteriaDto dto);
    }
}
