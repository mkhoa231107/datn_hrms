using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using HRMS.Infrastructure.Data;
using HRMS.Domain.Entities;

namespace SeedPhotos
{
    class Program
    {
        static async Task Main(string[] args)
        {
            Console.WriteLine("Starting Direct Database Photo Seeding...");
            
            // Set up configuration to read from appsettings.json
            var configuration = new ConfigurationBuilder()
                .SetBasePath(Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../HRMS.API")))
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
                .Build();

            var connectionString = configuration.GetConnectionString("DefaultConnection");
            
            var optionsBuilder = new DbContextOptionsBuilder<HRMSDbContext>();
            // Use Npgsql for Postgres
            optionsBuilder.UseNpgsql(connectionString);

            using var context = new HRMSDbContext(optionsBuilder.Options);
            using var httpClient = new HttpClient();
            
            var employees = await context.Employees.ToListAsync();
            Console.WriteLine($"Found {employees.Count} employees.");

            int success = 0;
            int failed = 0;
            
            // Ensure uploads directory exists
            var uploadsPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../HRMS.API/wwwroot/uploads/avatars"));
            if (!Directory.Exists(uploadsPath))
            {
                Directory.CreateDirectory(uploadsPath);
            }

            foreach (var emp in employees)
            {
                if (!string.IsNullOrEmpty(emp.Avatar))
                {
                    Console.WriteLine($"SKIP {emp.FullName} - Already has photo");
                    continue;
                }

                Console.Write($"Processing: {emp.FullName} ({emp.EmployeeCode})... ");

                try
                {
                    string photoUrl;
                    if (emp.FullName.Contains("Khoa"))
                    {
                        photoUrl = "https://i.ibb.co/qFmcFz9T/image.png";
                    }
                    else
                    {
                        string genderParam = (emp.Gender == "Nam" || emp.Gender == "Male") ? "male" : "female";
                        var randomUserRes = await httpClient.GetStringAsync($"https://randomuser.me/api/?gender={genderParam}&inc=picture");
                        
                        // Parse JSON simply (avoiding heavy dependencies)
                        int urlStart = randomUserRes.IndexOf("\"large\":\"") + 9;
                        int urlEnd = randomUserRes.IndexOf("\"", urlStart);
                        photoUrl = randomUserRes.Substring(urlStart, urlEnd - urlStart).Replace("\\/", "/");
                    }

                    var photoBytes = await httpClient.GetByteArrayAsync(photoUrl);
                    
                    var fileName = $"avatar_{emp.Id}_{Guid.NewGuid().ToString().Substring(0, 8)}.jpg";
                    var filePath = Path.Combine(uploadsPath, fileName);
                    
                    await File.WriteAllBytesAsync(filePath, photoBytes);
                    
                    emp.Avatar = $"/uploads/avatars/{fileName}";
                    
                    Console.WriteLine("OK");
                    success++;
                    
                    await Task.Delay(300); // Politeness delay
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"FAILED: {ex.Message}");
                    failed++;
                }
            }

            if (success > 0)
            {
                await context.SaveChangesAsync();
                Console.WriteLine("Database updated successfully.");
            }

            Console.WriteLine($"Done! Success: {success} | Failed: {failed}");
        }
    }
}
