using System;
using System.Collections.Generic;

namespace HRMS.Domain.Entities
{
    public class JobPosting
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string Requirements { get; set; }
        public string? Location { get; set; }
        public string? SalaryRange { get; set; }
        
        // Status
        public bool IsActive { get; set; } = true;
        
        // Dates
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ClosingDate { get; set; }
        
        // Navigation property for applications
        public ICollection<JobApplication> Applications { get; set; }
        
        // Navigation property for AI Screening Criteria
        public JobCriteria? JobCriteria { get; set; }
    }
}
