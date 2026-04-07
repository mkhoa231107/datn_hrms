using System;

namespace HRMS.Domain.Entities
{
    public class JobCriteria
    {
        public int Id { get; set; }
        
        public int JobPostingId { get; set; }
        public JobPosting JobPosting { get; set; }
        
        public string MustHaveSkills { get; set; } // Các kỹ năng bắt buộc (JSON or Comma separated)
        public string? NiceToHaveSkills { get; set; } // Kỹ năng cộng điểm
        public int? MinYearsOfExperience { get; set; } // Số năm kinh nghiệm tối thiểu
        public string? OtherRequirements { get; set; } // Yêu cầu khác (trình độ học vấn, v.v)
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
