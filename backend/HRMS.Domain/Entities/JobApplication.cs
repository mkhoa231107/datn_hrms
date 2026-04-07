using System;
using HRMS.Domain.Enums;

namespace HRMS.Domain.Entities
{
    public class JobApplication
    {
        public int Id { get; set; }
        
        public int JobPostingId { get; set; }
        public JobPosting JobPosting { get; set; }
        
        public int? UserId { get; set; }
        public User Candidate { get; set; }
        
        // Candidate information at time of applying
        public string CandidateName { get; set; }
        public string CandidateEmail { get; set; }
        public string CandidatePhone { get; set; }
        
        // Application details
        public string CVFilePath { get; set; }
        public string? CoverLetter { get; set; }
        
        // Status tracking
        public ApplicationStatus Status { get; set; } = ApplicationStatus.Pending;
        public DateTime AppliedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastUpdated { get; set; }
        
        // AI Screening results
        public int? AIMatchScore { get; set; }  // 0-100%
        public string? AIRecommendation { get; set; }  // LLM's explanation of the score
    }
}
