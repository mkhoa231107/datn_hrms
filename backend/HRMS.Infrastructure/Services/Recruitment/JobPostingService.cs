using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using HRMS.Application.DTOs.Recruitment;
using HRMS.Application.Interfaces.Recruitment;
using HRMS.Domain.Entities;
using HRMS.Infrastructure.Data;
using System;

namespace HRMS.Infrastructure.Services.Recruitment
{
    public class JobPostingService : IJobPostingService
    {
        private readonly HRMSDbContext _context;

        public JobPostingService(HRMSDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<JobPostingDto>> GetAllJobPostingsAsync(bool includeInactive = false)
        {
            var query = _context.JobPostings.AsQueryable();
            if (!includeInactive)
            {
                query = query.Where(x => x.IsActive && (x.ClosingDate == null || x.ClosingDate >= DateTime.UtcNow));
            }

            return await query.Select(x => new JobPostingDto
            {
                Id = x.Id,
                Title = x.Title,
                Description = x.Description,
                Requirements = x.Requirements,
                Location = x.Location,
                SalaryRange = x.SalaryRange,
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt,
                ClosingDate = x.ClosingDate
            }).OrderByDescending(x => x.CreatedAt).ToListAsync();
        }

        public async Task<JobPostingDto> GetJobPostingByIdAsync(int id)
        {
            var job = await _context.JobPostings.FindAsync(id);
            if (job == null) return null;

            return new JobPostingDto
            {
                Id = job.Id,
                Title = job.Title,
                Description = job.Description,
                Requirements = job.Requirements,
                Location = job.Location,
                SalaryRange = job.SalaryRange,
                IsActive = job.IsActive,
                CreatedAt = job.CreatedAt,
                ClosingDate = job.ClosingDate
            };
        }

        public async Task<JobPostingDto> CreateJobPostingAsync(int userId, CreateJobPostingDto dto)
        {
            var job = new JobPosting
            {
                Title = dto.Title,
                Description = dto.Description,
                Requirements = dto.Requirements,
                Location = dto.Location,
                SalaryRange = dto.SalaryRange,
                ClosingDate = dto.ClosingDate,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            _context.JobPostings.Add(job);
            await _context.SaveChangesAsync();
            
            return await GetJobPostingByIdAsync(job.Id);
        }

        public async Task<JobPostingDto> UpdateJobPostingAsync(int id, int userId, CreateJobPostingDto dto)
        {
            var job = await _context.JobPostings.FindAsync(id);
            if (job == null) throw new Exception("Job posting not found");

            job.Title = dto.Title;
            job.Description = dto.Description;
            job.Requirements = dto.Requirements;
            job.Location = dto.Location;
            job.SalaryRange = dto.SalaryRange;
            job.ClosingDate = dto.ClosingDate;
            job.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();
            return await GetJobPostingByIdAsync(job.Id);
        }

        public async Task DeleteJobPostingAsync(int id, int userId)
        {
            var job = await _context.JobPostings.FindAsync(id);
            if (job != null)
            {
                _context.JobPostings.Remove(job);
                await _context.SaveChangesAsync();
            }
        }

        public async Task ToggleJobPostingStatusAsync(int id, int userId)
        {
            var job = await _context.JobPostings.FindAsync(id);
            if (job != null)
            {
                job.IsActive = !job.IsActive;
                await _context.SaveChangesAsync();
            }
        }
    }
}
