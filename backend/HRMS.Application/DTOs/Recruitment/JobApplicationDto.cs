using HRMS.Domain.Enums;
using System;
using System.IO;

namespace HRMS.Application.DTOs.Recruitment
{
    public class JobApplicationDto
    {
        public int Id { get; set; }
        public int JobPostingId { get; set; }
        public string JobPostingTitle { get; set; }
        public int? UserId { get; set; }
        public string CandidateName { get; set; }
        public string CandidateEmail { get; set; }
        public string CandidatePhone { get; set; }
        public string CVFilePath { get; set; }
        public string? CoverLetter { get; set; }
        public ApplicationStatus Status { get; set; }
        public DateTime AppliedAt { get; set; }
        public int? AIMatchScore { get; set; }
        public string? AIRecommendation { get; set; }
    }

    public class CreateJobApplicationDto
    {
        public int JobPostingId { get; set; }
        public string CandidateName { get; set; }
        public string CandidateEmail { get; set; }
        public string CandidatePhone { get; set; }
        public string CVFileName { get; set; }
        public Stream CVFileStream { get; set; }
        public string? CoverLetter { get; set; }
    }
}
