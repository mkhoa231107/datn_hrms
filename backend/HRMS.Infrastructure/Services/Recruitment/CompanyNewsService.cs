using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using HRMS.Application.DTOs.Recruitment;
using HRMS.Application.Interfaces.Recruitment;
using HRMS.Domain.Entities;
using HRMS.Infrastructure.Data;
using System;

namespace HRMS.Infrastructure.Services.Recruitment
{
    public class CompanyNewsService : ICompanyNewsService
    {
        private readonly HRMSDbContext _context;

        public CompanyNewsService(HRMSDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<CompanyNewsDto>> GetAllNewsAsync(bool includeUnpublished = false)
        {
            var query = _context.CompanyNews.Include(c => c.Author).AsQueryable();
            if (!includeUnpublished)
            {
                query = query.Where(x => x.IsPublished);
            }

            return await query.Select(x => new CompanyNewsDto
            {
                Id = x.Id,
                Title = x.Title,
                Content = x.Content,
                ImageUrl = x.ImageUrl,
                IsPublished = x.IsPublished,
                PublishedAt = x.PublishedAt,
                AuthorId = x.AuthorId,
                AuthorName = x.Author != null ? x.Author.FullName : "Admin"
            }).OrderByDescending(x => x.PublishedAt).ToListAsync();
        }

        public async Task<CompanyNewsDto> GetNewsByIdAsync(int id)
        {
            var news = await _context.CompanyNews.Include(c => c.Author).FirstOrDefaultAsync(x => x.Id == id);
            if (news == null) return null;

            return new CompanyNewsDto
            {
                Id = news.Id,
                Title = news.Title,
                Content = news.Content,
                ImageUrl = news.ImageUrl,
                IsPublished = news.IsPublished,
                PublishedAt = news.PublishedAt,
                AuthorId = news.AuthorId,
                AuthorName = news.Author != null ? news.Author.FullName : "Admin"
            };
        }

        public async Task<CompanyNewsDto> CreateNewsAsync(int userId, CreateCompanyNewsDto dto)
        {
            var news = new CompanyNews
            {
                Title = dto.Title,
                Content = dto.Content,
                ImageUrl = dto.ImageUrl,
                IsPublished = dto.IsPublished,
                PublishedAt = DateTime.UtcNow,
                AuthorId = userId
            };

            _context.CompanyNews.Add(news);
            await _context.SaveChangesAsync();
            
            return await GetNewsByIdAsync(news.Id);
        }

        public async Task<CompanyNewsDto> UpdateNewsAsync(int id, int userId, CreateCompanyNewsDto dto)
        {
            var news = await _context.CompanyNews.FindAsync(id);
            if (news == null) throw new Exception("News not found");

            news.Title = dto.Title;
            news.Content = dto.Content;
            news.ImageUrl = dto.ImageUrl;
            news.IsPublished = dto.IsPublished;

            await _context.SaveChangesAsync();
            return await GetNewsByIdAsync(news.Id);
        }

        public async Task DeleteNewsAsync(int id, int userId)
        {
            var news = await _context.CompanyNews.FindAsync(id);
            if (news != null)
            {
                _context.CompanyNews.Remove(news);
                await _context.SaveChangesAsync();
            }
        }
    }
}
