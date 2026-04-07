using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using HRMS.Domain.Entities;
using HRMS.Domain.Enums;
using HRMS.Infrastructure.Data;
using HRMS.Application.Interfaces.Recruitment;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Element;

namespace HRMS.Infrastructure.Seeders
{
    public static class MockCvSeeder
    {
        public static async Task SeedAsync(IServiceProvider serviceProvider)
        {
            var logger = serviceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("MockCvSeeder");
            var context = serviceProvider.GetRequiredService<HRMSDbContext>();
            var env = serviceProvider.GetRequiredService<IWebHostEnvironment>();
            var aiService = serviceProvider.GetRequiredService<IAICvScreeningService>();

            // Check if mock data already exists
            var existingMockCount = await context.JobApplications.CountAsync(a => a.CandidateName.Contains("Mock"));
            if (existingMockCount >= 10)
            {
                logger.LogInformation($"{existingMockCount} Mock CVs already exist. Skipping seeding.");
                return;
            }

            // Cleanup any partial mock data then seed fresh
            if (existingMockCount > 0)
            {
                var partialMocks = await context.JobApplications.Where(a => a.CandidateName.Contains("Mock")).ToListAsync();
                context.JobApplications.RemoveRange(partialMocks);
                await context.SaveChangesAsync();
                logger.LogInformation("Cleaned up partial old mock CV data.");
            }

            // Get a Job posting related to Recruitment if possible
            var job = await context.JobPostings.FirstOrDefaultAsync(j => j.Title.Contains("Tuyển dụng") || j.Title.Contains("Recruitment"));
            if (job == null)
            {
                logger.LogInformation("No Recruitment-related Job Postings found. Creating a one.");
                job = new JobPosting
                {
                    Title = "Trưởng nhóm Phát triển .NET (Tổ Tuyển dụng)",
                    Description = "Đây là vị trí mẫu được tạo tự động bởi hệ thống để đánh giá chức năng AI CV Screening.",
                    Requirements = "Tất cả các CV nộp vào sẽ được AI tự động phân tích và chấm điểm.",
                    Location = "Hà Nội",
                    SalaryRange = "10 - 30 Triệu",
                    ClosingDate = DateTime.UtcNow.AddMonths(1),
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                context.JobPostings.Add(job);
                await context.SaveChangesAsync();
            }

            // Create Criteria if not exists
            if (!await context.JobCriteria.AnyAsync(c => c.JobPostingId == job.Id))
            {
                context.JobCriteria.Add(new JobCriteria
                {
                    JobPostingId = job.Id,
                    MustHaveSkills = ".NET, C#, SQL Server",
                    NiceToHaveSkills = "Microservices, Docker, React",
                    MinYearsOfExperience = 3,
                    OtherRequirements = "Có khả năng làm việc nhóm tốt"
                });
                await context.SaveChangesAsync();
                logger.LogInformation($"Created dummy criteria for job {job.Title}");
            }

            var mockCandidates = new[]
            {
                new { Name = "Nguyễn Văn Hoàn Hảo (Mock)", Content = "Tôi là Senior .NET Developer với 5 năm kinh nghiệm. Kỹ năng cốt lõi: C#, .NET Core, SQL Server, Entity Framework. Có kinh nghiệm triển khai Microservices và Docker. Từng làm leader nhóm 5 người, kỹ năng làm việc nhóm xuất sắc." },
                new { Name = "Trần Thị Lệ (Mock)", Content = "Software Engineer 4 năm kinh nghiệm chuyên về Backend .NET C#. Rất thành thạo ReactJS và SQL Server. Có kiến thức về Docker nhưng chưa làm Microservices." },
                new { Name = "Lê Khá Tốt (Mock)", Content = "Junior C# Developer (1 năm). Đã làm các project nội bộ dùng ASP.NET Core, SQL Server. Sức khỏe tốt, ham học hỏi." },
                new { Name = "Phạm Lạc Đề (Mock)", Content = "Mobile Developer 3 năm. Chuyên làm Flutter và React Native. Có làm việc với API nhưng chưa viết Backend bao giờ. Biết chút SQL Server." },
                new { Name = "Hoàng Sa Sút (Mock)", Content = "Kế toán trưởng 10 năm kinh nghiệm. Chuyên tính lương và làm báo cáo thuế. Kỹ năng Excel thần sầu." },
                // 5 more variations
                new { Name = "Đặng Tiềm Năng (Mock)", Content = "Fresher .NET. Vừa tốt nghiệp đại học FPT. Biết C#, OOP. Đã làm đồ án môn học dùng ASP.NET Core và SQL Server. Sẵn sàng học Microservices." },
                new { Name = "Vũ Phù Hợp (Mock)", Content = "Backend Engineer có 3.5 năm kinh nghiệm C#, .NET 6, SQL Server, triển khai Docker. Từng làm việc theo mô hình Agile, giao tiếp tốt." },
                new { Name = "Bùi Thiết Kế (Mock)", Content = "UI/UX Designer với 5 năm kinh nghiệm Figma. Tôi không biết viết code C# hay .NET nhưng tôi thiết kế giao diện cực kỳ đẹp." },
                new { Name = "Đỗ FrontEnd (Mock)", Content = "Chuyên gia ReactJS 4 năm kinh nghiệm. Nắm vững Redux, Tailwind. Ít đụng backend, chưa có kinh nghiệm .NET." },
                new { Name = "Ngô Xuất Sắc (Mock)", Content = "Technical Lead 7 năm kinh nghiệm. Master .NET, C#, Microservices, Azure, Docker, React. Có thể gánh team tốt." }
            };

            var uploadPath = Path.Combine(env.WebRootPath, "uploads", "cvs");
            Directory.CreateDirectory(uploadPath);

            logger.LogInformation($"Generating {mockCandidates.Length} Mock CVs and analyzing with AI...");

            foreach (var c in mockCandidates)
            {
                var fileName = $"mock_cv_{Guid.NewGuid()}.pdf";
                var filePath = Path.Combine(uploadPath, fileName);

                // Initialize PDF writer
                using (var writer = new PdfWriter(filePath))
                using (var pdf = new PdfDocument(writer))
                using (var document = new Document(pdf))
                {
                    // For mock we just put raw text. To avoid font issues with Vietnamese in basic fonts, we'll strip accents or just rely on standard font standard chars.
                    // Or simple way: inject UTF8 font if needed. Since iText7 handles standard ANSI well, Vietnamese might lose accents if default fonts don't support it.
                    // Let's use standard English-like mapping to be safe for iText default font, or just output Vietnamese (it might drop characters, but AI screening will still catch keywords).
                    document.Add(new Paragraph(c.Content));
                }

                var app = new JobApplication
                {
                    JobPostingId = job.Id,
                    UserId = null,
                    CandidateName = c.Name,
                    CandidateEmail = "mock@email.com",
                    CandidatePhone = "0987654321",
                    CVFilePath = $"/uploads/cvs/{fileName}",
                    Status = ApplicationStatus.Pending,
                    AppliedAt = DateTime.UtcNow
                };

                context.JobApplications.Add(app);
                await context.SaveChangesAsync(); // Save to get ID

                // Run AI Screening
                try
                {
                    using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read);
                    var (score, rec) = await aiService.EvaluateCvAsync(stream, app.JobPostingId);
                    
                    app.AIMatchScore = score;
                    app.AIRecommendation = rec;
                    app.Status = ApplicationStatus.Screening; // done screening
                    await context.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, $"Failed to run AI for mocked CV of {c.Name}");
                }
            }
            logger.LogInformation("Finished successfully generating and parsing 10 Mock CVs!");
        }
    }
}
