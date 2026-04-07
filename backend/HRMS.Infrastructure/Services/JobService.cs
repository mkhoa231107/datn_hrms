using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using HRMS.Application.DTOs.Jobs;
using HRMS.Application.Interfaces;
using HRMS.Domain.Entities;
using HRMS.Domain.Enums;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HRMS.Infrastructure.Services
{
    public class JobService : IJobService
    {
        private readonly HRMSDbContext _context;
        private readonly IMapper _mapper;

        public JobService(HRMSDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<int> CreateJobAsync(int userId, JobCreateDto dto)
        {
            // Ánh xạ Manager UserId sang EmployeeId
            var manager = await _context.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            if (manager == null) throw new InvalidOperationException("Không tìm thấy thông tin quản lý.");

            var job = _mapper.Map<JobAssignment>(dto);
            job.ManagerId = manager.Id;
            job.Status = Domain.Enums.TaskStatus.New;
            job.CreatedAt = DateTime.UtcNow;

            _context.JobAssignments.Add(job);
            await _context.SaveChangesAsync();
            return job.Id;
        }

        public async Task<IEnumerable<JobResponseDto>> GetEmployeeTasksAsync(int userId)
        {
            // Tìm EmployeeId từ UserId
            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            if (employee == null) return Enumerable.Empty<JobResponseDto>();

            var jobs = await _context.JobAssignments
                .Include(j => j.Manager)
                .Include(j => j.Employee)
                .Include(j => j.Updates)
                .Where(j => j.EmployeeId == employee.Id)
                .OrderByDescending(j => j.CreatedAt)
                .ToListAsync();

            return _mapper.Map<IEnumerable<JobResponseDto>>(jobs);
        }

        public async Task<IEnumerable<JobResponseDto>> GetManagerTasksAsync(int userId)
        {
            // Tìm EmployeeId của quản lý từ UserId
            var manager = await _context.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            if (manager == null) return Enumerable.Empty<JobResponseDto>();

            var jobs = await _context.JobAssignments
                .Include(j => j.Manager)
                .Include(j => j.Employee)
                .Include(j => j.Updates)
                .Where(j => j.ManagerId == manager.Id)
                .OrderByDescending(j => j.CreatedAt)
                .ToListAsync();

            return _mapper.Map<IEnumerable<JobResponseDto>>(jobs);
        }

        public async Task<JobResponseDto> GetJobByIdAsync(int jobId, int currentUserId, bool isAdminOrHrAdmin)
        {
            var job = await _context.JobAssignments
                .Include(j => j.Manager)
                .Include(j => j.Employee)
                .Include(j => j.Updates)
                .FirstOrDefaultAsync(j => j.Id == jobId);

            if (job == null) throw new KeyNotFoundException("Không tìm thấy công việc.");

            // Admin hoặc HrAdmin: xem tất cả
            if (isAdminOrHrAdmin)
            {
                return _mapper.Map<JobResponseDto>(job);
            }

            // Map current user -> Employee
            var currentEmployee = await _context.Employees
                .FirstOrDefaultAsync(e => e.UserId == currentUserId);

            if (currentEmployee == null)
            {
                throw new UnauthorizedAccessException("Không tìm thấy thông tin nhân viên hiện tại.");
            }

            // Nhân viên bình thường: chỉ xem công việc được giao cho mình hoặc do mình tạo
            if (job.EmployeeId != currentEmployee.Id && job.ManagerId != currentEmployee.Id)
            {
                throw new UnauthorizedAccessException("Bạn không có quyền xem công việc này.");
            }

            return _mapper.Map<JobResponseDto>(job);
        }

        public async Task UpdateProgressAsync(int userId, int jobId, JobUpdateProgressDto dto)
        {
            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            if (employee == null) throw new InvalidOperationException("Không tìm thấy thông tin nhân viên.");

            var job = await _context.JobAssignments.FindAsync(jobId);
            if (job == null) throw new KeyNotFoundException("Không tìm thấy công việc.");
            if (job.EmployeeId != employee.Id) throw new UnauthorizedAccessException("Bạn không có quyền cập nhật công việc này.");

            var update = new TaskUpdate
            {
                JobAssignmentId = jobId,
                UpdateContent = dto.Content,
                AttachmentUrl = dto.AttachmentUrl,
                UpdateTime = DateTime.UtcNow
            };

            job.CompletionPercentage = dto.CompletionPercentage;
            job.Status = Domain.Enums.TaskStatus.PendingReview;
            job.UpdatedAt = DateTime.UtcNow;

            _context.TaskUpdates.Add(update);
            await _context.SaveChangesAsync();
        }

        public async Task EvaluateJobAsync(int userId, int jobId, JobEvaluationDto dto)
        {
            var manager = await _context.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            if (manager == null) throw new InvalidOperationException("Không tìm thấy thông tin quản lý.");

            var job = await _context.JobAssignments.FindAsync(jobId);
            if (job == null) throw new KeyNotFoundException("Không tìm thấy công việc.");
            if (job.ManagerId != manager.Id) throw new UnauthorizedAccessException("Bạn không có quyền đánh giá công việc này.");

            job.EvaluationScore = dto.Score;
            job.Status = Domain.Enums.TaskStatus.Completed;
            job.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }
    }
}
