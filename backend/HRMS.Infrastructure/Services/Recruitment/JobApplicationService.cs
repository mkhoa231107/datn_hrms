using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Hosting;
using System.IO;
using System;
using HRMS.Application.DTOs.Recruitment;
using HRMS.Application.Interfaces.Recruitment;
using HRMS.Domain.Entities;
using HRMS.Domain.Enums;
using HRMS.Infrastructure.Data;
using Microsoft.Extensions.DependencyInjection;

namespace HRMS.Infrastructure.Services.Recruitment
{
    public class JobApplicationService : IJobApplicationService
    {
        private readonly HRMSDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly Microsoft.Extensions.DependencyInjection.IServiceScopeFactory _serviceScopeFactory;

        public JobApplicationService(HRMSDbContext context, IWebHostEnvironment env, Microsoft.Extensions.DependencyInjection.IServiceScopeFactory serviceScopeFactory)
        {
            _context = context;
            _env = env;
            _serviceScopeFactory = serviceScopeFactory;
        }

        public async Task<IEnumerable<JobApplicationDto>> GetApplicationsByJobIdAsync(int jobId)
        {
            var applications = await _context.JobApplications
                .Include(ja => ja.JobPosting)
                .Where(ja => ja.JobPostingId == jobId)
                .OrderByDescending(ja => ja.AppliedAt)
                .ToListAsync();

            return applications.Select(ja => MapToDto(ja));
        }

        public async Task<JobApplicationDto> GetApplicationByIdAsync(int id)
        {
            var app = await _context.JobApplications
                .Include(ja => ja.JobPosting)
                .FirstOrDefaultAsync(ja => ja.Id == id);
            
            if (app == null) return null;
            return MapToDto(app);
        }

        public async Task<IEnumerable<JobApplicationDto>> GetApplicationsByCandidateAsync(int userId)
        {
            var applications = await _context.JobApplications
                .Include(ja => ja.JobPosting)
                .Where(ja => ja.UserId == userId)
                .OrderByDescending(ja => ja.AppliedAt)
                .ToListAsync();

            return applications.Select(ja => MapToDto(ja));
        }

        public async Task<JobApplicationDto> ScreenApplicationAsync(int id)
        {
            var app = await _context.JobApplications
                .Include(ja => ja.JobPosting)
                .FirstOrDefaultAsync(ja => ja.Id == id);
                
            if (app == null) throw new Exception("Application not found");
            
            using var scope = _serviceScopeFactory.CreateScope();
            var aiService = scope.ServiceProvider.GetRequiredService<IAICvScreeningService>();
            
            if (string.IsNullOrEmpty(app.CVFilePath)) return MapToDto(app);
            
            var cvPath = Path.Combine(_env.WebRootPath, app.CVFilePath.TrimStart('/'));
            if (!File.Exists(cvPath)) return MapToDto(app);
            
            using var stream = new FileStream(cvPath, FileMode.Open, FileAccess.Read);
            var (score, recommendation) = await aiService.EvaluateCvAsync(stream, app.JobPostingId);
            
            app.AIMatchScore = score;
            app.AIRecommendation = recommendation;
            
            await _context.SaveChangesAsync();
            return MapToDto(app);
        }

        public async Task<JobApplicationDto> CreateApplicationAsync(int? userId, CreateJobApplicationDto dto)
        {
            string? cvPath = null;

            if (dto.CVFileStream != null && !string.IsNullOrEmpty(dto.CVFileName))
            {
                var uploadsFolder = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "cvs");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                var fileName = Guid.NewGuid().ToString() + Path.GetExtension(dto.CVFileName);
                var filePath = Path.Combine(uploadsFolder, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await dto.CVFileStream.CopyToAsync(stream);
                }

                cvPath = $"/uploads/cvs/{fileName}";
            }

            var application = new JobApplication
            {
                JobPostingId = dto.JobPostingId,
                UserId = userId,
                CandidateName = dto.CandidateName,
                CandidateEmail = dto.CandidateEmail,
                CandidatePhone = dto.CandidatePhone,
                CVFilePath = cvPath,
                CoverLetter = dto.CoverLetter,
                Status = ApplicationStatus.Pending,
                AppliedAt = DateTime.UtcNow
            };

            _context.JobApplications.Add(application);
            await _context.SaveChangesAsync();

            // Trigger AI Background Screening
            if (!string.IsNullOrEmpty(cvPath))
            {
                var fullFilePath = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), cvPath.TrimStart('/'));
                _ = Task.Run(() => RunAiScreeningAsync(application.Id, dto.JobPostingId, fullFilePath));
            }

            return await GetApplicationByIdAsync(application.Id);
        }

        private async Task RunAiScreeningAsync(int applicationId, int jobPostingId, string cvFilePath)
        {
            try
            {
                // Must create a new scope because the current DbContext might be disposed when HTTP request ends
                using var scope = _serviceScopeFactory.CreateScope();
                var aiService = scope.ServiceProvider.GetRequiredService<IAICvScreeningService>();
                var dbContext = scope.ServiceProvider.GetRequiredService<HRMSDbContext>();

                // Ensure file exists
                if (!File.Exists(cvFilePath)) return;

                using var fileStream = new FileStream(cvFilePath, FileMode.Open, FileAccess.Read, FileShare.Read);
                
                var (score, recommendation) = await aiService.EvaluateCvAsync(fileStream, jobPostingId);

                var dbApp = await dbContext.JobApplications.FindAsync(applicationId);
                if (dbApp != null)
                {
                    dbApp.AIMatchScore = score;
                    dbApp.AIRecommendation = recommendation;
                    await dbContext.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AI Screening Background Task Error]: {ex.Message}");
            }
        }

        public async Task UpdateApplicationStatusAsync(int id, int userId, ApplicationStatus newStatus)
        {
            var application = await _context.JobApplications.FindAsync(id);
            if (application == null) throw new Exception("Application not found");

            application.Status = newStatus;
            application.LastUpdated = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
        }

        private static JobApplicationDto MapToDto(JobApplication ja)
        {
            return new JobApplicationDto
            {
                Id = ja.Id,
                JobPostingId = ja.JobPostingId,
                JobPostingTitle = ja.JobPosting?.Title ?? "Unknown Job",
                UserId = ja.UserId,
                CandidateName = ja.CandidateName,
                CandidateEmail = ja.CandidateEmail,
                CandidatePhone = ja.CandidatePhone,
                CVFilePath = ja.CVFilePath,
                CoverLetter = ja.CoverLetter,
                Status = ja.Status,
                AppliedAt = ja.AppliedAt,
                AIMatchScore = ja.AIMatchScore,
                AIRecommendation = ja.AIRecommendation
            };
        }
    }
}
