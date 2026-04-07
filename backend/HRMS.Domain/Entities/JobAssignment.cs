using System;
using System.Collections.Generic;
using HRMS.Domain.Enums;

namespace HRMS.Domain.Entities
{
    public class JobAssignment
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        
        public int EmployeeId { get; set; }
        public Employee Employee { get; set; }
        
        public int ManagerId { get; set; }
        public Employee Manager { get; set; } // Người giao việc (thường là DepartmentManager)
        
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        
        public TaskPriority Priority { get; set; } = TaskPriority.Medium;
        public HRMS.Domain.Enums.TaskStatus Status { get; set; } = HRMS.Domain.Enums.TaskStatus.New;
        
        public int Weight { get; set; } = 1; // Trọng số công việc (1-10)
        public decimal? EvaluationScore { get; set; } // Điểm đánh giá (1-12)
        public int CompletionPercentage { get; set; } = 0; // % hoàn thành
        
        public string? InstructionFileUrl { get; set; } // File hướng dẫn đính kèm
        
        public List<TaskUpdate> Updates { get; set; } = new List<TaskUpdate>();
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
