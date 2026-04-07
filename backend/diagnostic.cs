using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using HRMS.Infrastructure.Data;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using System.IO;

namespace HRMS.Diagnostic
{
    class Program
    {
        static void Main(string[] args)
        {
            var configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json")
                .Build();

            var optionsBuilder = new DbContextOptionsBuilder<HRMSDbContext>();
            optionsBuilder.UseSqlServer(configuration.GetConnectionString("DefaultConnection"));

            using (var context = new HRMSDbContext(optionsBuilder.Options))
            {
                try
                {
                    var jobCount = context.JobPostings.Count();
                    var appCount = context.JobApplications.Count();
                    var criteriaCount = context.JobCriteria.Count();
                    var userCount = context.Users.Count();

                    Console.WriteLine($"Jobs: {jobCount}");
                    Console.WriteLine($"Applications: {appCount}");
                    Console.WriteLine($"Criteria: {criteriaCount}");
                    Console.WriteLine($"Users: {userCount}");

                    if (jobCount > 0)
                    {
                        var firstJob = context.JobPostings.First();
                        Console.WriteLine($"First Job: {firstJob.Title} (ID: {firstJob.Id})");
                    }

                    var headPosition = context.Positions.FirstOrDefault(p => p.PositionCode == "HR-REC-HEAD");
                    if (headPosition != null)
                    {
                        Console.WriteLine($"Found HR-REC-HEAD position. ID: {headPosition.Id}");
                    }
                    else
                    {
                        Console.WriteLine("HR-REC-HEAD position NOT found.");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error: {ex.Message}");
                }
            }
        }
    }
}
