using System;

namespace HRMS.Application.DTOs.Recruitment
{
    public class CompanyNewsDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Content { get; set; }
        public string? ImageUrl { get; set; }
        public bool IsPublished { get; set; }
        public DateTime PublishedAt { get; set; }
        public int AuthorId { get; set; }
        public string AuthorName { get; set; }
    }

    public class CreateCompanyNewsDto
    {
        public string Title { get; set; }
        public string Content { get; set; }
        public string? ImageUrl { get; set; }
        public bool IsPublished { get; set; } = true;
    }
}
