using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;

namespace HRMS.Infrastructure.Seeders
{
    public static class CleanupSeeder
    {
        public static async Task SeedAsync(HRMSDbContext context)
        {
            Console.WriteLine("🧹 CleanupSeeder: Destructive reset (Drop & Recreate)...");

            try 
            {
                // Ensure migrations are applied without deleting existing data
                Console.WriteLine("  - Applying migrations (preserving existing data)...");
                await context.Database.MigrateAsync();
                
                Console.WriteLine("✅ Database migrations applied.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Critical cleanup error: {ex.Message}");
                throw; // Rethrow to stop capitalization if cleanup fails
            }
        }
    }
}
