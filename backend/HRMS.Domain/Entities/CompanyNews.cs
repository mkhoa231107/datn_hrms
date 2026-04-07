using System;

namespace HRMS.Domain.Entities
{
    public class CompanyNews
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Content { get; set; }
        public string? ImageUrl { get; set; }
        public bool IsPublished { get; set; } = true;
        public DateTime PublishedAt { get; set; } = DateTime.UtcNow;
        public int AuthorId { get; set; }
        public User Author { get; set; }
    }
}
