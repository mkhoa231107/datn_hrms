using System;
using HRMS.Domain.Enums;

namespace HRMS.Application.DTOs.Jobs
{
    public class JobCreateDto
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int EmployeeId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public TaskPriority Priority { get; set; } = TaskPriority.Medium;
        public int Weight { get; set; } = 1;
        public string? InstructionFileUrl { get; set; }
    }

    public class JobUpdateProgressDto
    {
        public string Content { get; set; } = string.Empty;
        public string? AttachmentUrl { get; set; }
        public int CompletionPercentage { get; set; }
    }

    public class JobEvaluationDto
    {
        public decimal Score { get; set; } // 1-12
        public string? ManagerNote { get; set; }
    }

    public class JobResponseDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public int ManagerId { get; set; }
        public string ManagerName { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public TaskPriority Priority { get; set; }
        public HRMS.Domain.Enums.TaskStatus Status { get; set; }
        public int Weight { get; set; }
        public decimal? EvaluationScore { get; set; }
        public int CompletionPercentage { get; set; }
        public string? InstructionFileUrl { get; set; }
        public List<TaskUpdateDto> Updates { get; set; } = new List<TaskUpdateDto>();
        public DateTime CreatedAt { get; set; }
    }

    public class TaskUpdateDto
    {
        public int Id { get; set; }
        public string UpdateContent { get; set; } = string.Empty;
        public string? AttachmentUrl { get; set; }
        public DateTime UpdateTime { get; set; }
    }
}


