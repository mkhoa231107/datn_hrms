using HRMS.Application.DTOs.Recruitment;
using HRMS.Application.Interfaces.Recruitment;
using HRMS.Domain.Entities;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;

namespace HRMS.Infrastructure.Services.Recruitment
{
    public class JobCriteriaService : IJobCriteriaService
    {
        private readonly HRMSDbContext _context;

        public JobCriteriaService(HRMSDbContext context)
        {
            _context = context;
        }

        public async Task<JobCriteriaDto> GetByJobPostingIdAsync(int jobPostingId)
        {
            var criteria = await _context.JobCriteria
                .FirstOrDefaultAsync(c => c.JobPostingId == jobPostingId);

            if (criteria == null) return null;

            return new JobCriteriaDto
            {
                Id = criteria.Id,
                JobPostingId = criteria.JobPostingId,
                MustHaveSkills = criteria.MustHaveSkills,
                NiceToHaveSkills = criteria.NiceToHaveSkills,
                MinYearsOfExperience = criteria.MinYearsOfExperience,
                OtherRequirements = criteria.OtherRequirements,
                CreatedAt = criteria.CreatedAt,
                UpdatedAt = criteria.UpdatedAt
            };
        }

        public async Task<JobCriteriaDto> UpsertCriteriaAsync(UpsertJobCriteriaDto dto)
        {
            var jobPosting = await _context.JobPostings.FindAsync(dto.JobPostingId);
            if (jobPosting == null)
            {
                throw new Exception("Job posting not found");
            }

            var existingCriteria = await _context.JobCriteria
                .FirstOrDefaultAsync(c => c.JobPostingId == dto.JobPostingId);

            if (existingCriteria == null)
            {
                // Create new
                var newCriteria = new JobCriteria
                {
                    JobPostingId = dto.JobPostingId,
                    MustHaveSkills = dto.MustHaveSkills,
                    NiceToHaveSkills = dto.NiceToHaveSkills,
                    MinYearsOfExperience = dto.MinYearsOfExperience,
                    OtherRequirements = dto.OtherRequirements,
                    CreatedAt = DateTime.UtcNow
                };
                _context.JobCriteria.Add(newCriteria);
                await _context.SaveChangesAsync();
                
                return await GetByJobPostingIdAsync(newCriteria.JobPostingId);
            }
            else
            {
                // Update existing
                existingCriteria.MustHaveSkills = dto.MustHaveSkills;
                existingCriteria.NiceToHaveSkills = dto.NiceToHaveSkills;
                existingCriteria.MinYearsOfExperience = dto.MinYearsOfExperience;
                existingCriteria.OtherRequirements = dto.OtherRequirements;
                existingCriteria.UpdatedAt = DateTime.UtcNow;

                _context.JobCriteria.Update(existingCriteria);
                await _context.SaveChangesAsync();

                return await GetByJobPostingIdAsync(existingCriteria.JobPostingId);
            }
        }
    }
}
