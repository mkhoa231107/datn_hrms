using System;

namespace HRMS.Application.DTOs.Recruitment
{
    public class JobCriteriaDto
    {
        public int Id { get; set; }
        public int JobPostingId { get; set; }
        
        public string MustHaveSkills { get; set; }
        public string? NiceToHaveSkills { get; set; }
        public int? MinYearsOfExperience { get; set; }
        public string? OtherRequirements { get; set; }
        
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class UpsertJobCriteriaDto
    {
        public int JobPostingId { get; set; }
        
        public string MustHaveSkills { get; set; }
        public string? NiceToHaveSkills { get; set; }
        public int? MinYearsOfExperience { get; set; }
        public string? OtherRequirements { get; set; }
    }
}
