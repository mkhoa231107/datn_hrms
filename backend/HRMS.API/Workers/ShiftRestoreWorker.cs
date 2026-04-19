using HRMS.Application.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace HRMS.API.Workers
{
    /// <summary>
    /// Background Worker chạy hàng ngày để:
    /// 1. Khôi phục ca làm gốc (từ hợp đồng) cho các đơn đổi ca đã hết hạn.
    /// 2. (Tương lai) Tự động generate lịch cho nhân viên có hợp đồng mới.
    /// </summary>
    public class ShiftRestoreWorker : BackgroundService
    {
        private readonly ILogger<ShiftRestoreWorker> _logger;
        private readonly IServiceProvider _serviceProvider;

        public ShiftRestoreWorker(ILogger<ShiftRestoreWorker> logger, IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("ShiftRestoreWorker is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await RestoreExpiredShiftsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"⚠️ [CRITICAL] ShiftRestoreWorker Error: {ex.Message}");
                    try { _logger.LogError("ShiftRestoreWorker encountered a processing error."); } catch { }
                    await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
                    continue;
                }

                // Chạy một lần mỗi ngày vào nửa đêm
                var now = DateTime.Now;
                var nextMidnight = now.Date.AddDays(1);
                var delay = nextMidnight - now;

                _logger.LogInformation("ShiftRestoreWorker is sleeping until {NextMidnight}.", nextMidnight);
                await Task.Delay(delay, stoppingToken);
            }
        }

        private async Task RestoreExpiredShiftsAsync(CancellationToken stoppingToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var scheduleService = scope.ServiceProvider.GetRequiredService<IWorkScheduleService>();

            _logger.LogInformation("ShiftRestoreWorker: Checking for expired shift change requests...");

            var restored = await scheduleService.RestoreExpiredShiftChangesAsync();

            if (restored > 0)
                _logger.LogInformation("ShiftRestoreWorker: Restored {Count} work schedule days back to contract shifts.", restored);
            else
                _logger.LogInformation("ShiftRestoreWorker: No expired shift changes to restore.");
        }
    }
}
