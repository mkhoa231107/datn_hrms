using System;

namespace HRMS.Application.DTOs.Recruitment
{
    public class JobPostingDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string Requirements { get; set; }
        public string? Location { get; set; }
        public string? SalaryRange { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ClosingDate { get; set; }
    }
    
    public class CreateJobPostingDto
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public string Requirements { get; set; }
        public string? Location { get; set; }
        public string? SalaryRange { get; set; }
        public DateTime? ClosingDate { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
