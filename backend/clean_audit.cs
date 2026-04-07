using Microsoft.EntityFrameworkCore;
using HRMS.Infrastructure.Data;
using System.Linq;
using System;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var host = Host.CreateDefaultBuilder(args)
    .ConfigureServices((hostContext, services) => {
        services.AddDbContext<HRMSDbContext>(options =>
            options.UseSqlServer("Server=localhost\\SQLEXPRESS;Database=HRMS_DATN;Trusted_Connection=True;TrustServerCertificate=True;"));
    }).Build();

using (var scope = host.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<HRMSDbContext>();
    
    // 1. Tìm UserId của Bùi Thu Hồng
    var user = await context.Employees
        .Where(e => e.FullName.Contains("Bùi Thu Hồng"))
        .Select(e => e.UserId)
        .FirstOrDefaultAsync();
        
    if (user == null) {
        Console.WriteLine("Cảnh báo: Không tìm thấy người dùng Bùi Thu Hồng.");
        return;
    }
    
    Console.WriteLine($"Đang xử lý UserId: {user}");

    // 2. Tìm các bản ghi spam ngày 25/3/2026
    var targetDate = new DateTime(2026, 3, 25);
    var spamLogs = await context.AuditLogs
        .Where(l => l.UserId == user && 
                    l.CreatedAt.Date == targetDate.Date &&
                    l.Action.Contains("POST"))
        .OrderByDescending(l => l.CreatedAt)
        .ToListAsync();

    if (spamLogs.Count > 1) {
        // Giữ lại 1 cái mới nhất, xóa những cái còn lại
        var toDelete = spamLogs.Skip(1).ToList();
        Console.WriteLine($"Tìm thấy {spamLogs.Count} bản ghi. Đang xóa {toDelete.Count} bản ghi spam...");
        
        context.AuditLogs.RemoveRange(toDelete);
        await context.SaveChangesAsync();
        Console.WriteLine("Dọn dẹp hoàn tất!");
    } else {
        Console.WriteLine("Không tìm thấy spam đáng kể để xóa.");
    }
}
