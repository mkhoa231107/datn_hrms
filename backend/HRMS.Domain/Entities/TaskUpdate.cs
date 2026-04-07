using System;

namespace HRMS.Domain.Entities
{
    public class TaskUpdate
    {
        public int Id { get; set; }
        
        public int JobAssignmentId { get; set; }
        public JobAssignment JobAssignment { get; set; }
        
        public string UpdateContent { get; set; } = string.Empty; // Nội dung báo cáo
        public string? AttachmentUrl { get; set; } // File đính kèm báo cáo
        
        public DateTime UpdateTime { get; set; } = DateTime.UtcNow;
    }
}
