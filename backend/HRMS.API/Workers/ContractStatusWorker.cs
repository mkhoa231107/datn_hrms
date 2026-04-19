using HRMS.Application.Interfaces;
using HRMS.Domain.Enums;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace HRMS.API.Workers
{
    public class ContractStatusWorker : BackgroundService
    {
        private readonly ILogger<ContractStatusWorker> _logger;
        private readonly IServiceProvider _serviceProvider;

        public ContractStatusWorker(ILogger<ContractStatusWorker> logger, IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Contract Status Worker is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessContractsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"⚠️ [CRITICAL] ContractStatusWorker Error: {ex.Message}");
                    try { _logger.LogError("ContractStatusWorker encountered a processing error."); } catch { }
                    await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
                    continue;
                }

                // Run once a day at midnight.
                var now = DateTime.Now;
                var nextMidnight = now.Date.AddDays(1);
                var delay = nextMidnight - now;
                
                _logger.LogInformation("Contract Status Worker is sleeping until {NextMidnight}.", nextMidnight);
                await Task.Delay(delay, stoppingToken);
            }
        }

        private async Task ProcessContractsAsync(CancellationToken stoppingToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<HRMSDbContext>();
            var scheduleService = scope.ServiceProvider.GetRequiredService<IWorkScheduleService>();
            var today = DateTime.UtcNow.Date;
            
            _logger.LogInformation("Processing contracts for date: {Today}", today);

            // ─────────────────────────────────────────────────────────────────
            // 1. WaitingSign → Active (if today >= StartDate and employee signed)
            // ─────────────────────────────────────────────────────────────────
            var waitingContracts = await dbContext.EmployeeContracts
                .Where(c => c.Status == ContractStatus.WaitingSign && c.EmployeeSignedAt != null)
                .ToListAsync(stoppingToken);

            int activatedCount = 0;
            foreach (var contract in waitingContracts)
            {
                if (today >= contract.StartDate.Date)
                {
                    contract.Status = ContractStatus.Active;
                    activatedCount++;
                }
            }

            // ─────────────────────────────────────────────────────────────────
            // 2. Active → Expired (if today > EndDate)
            // ─────────────────────────────────────────────────────────────────
            var activeContracts = await dbContext.EmployeeContracts
                .Where(c => c.Status == ContractStatus.Active && c.EndDate != null)
                .ToListAsync(stoppingToken);

            int expiredCount = 0;
            foreach (var contract in activeContracts)
            {
                if (contract.EndDate.HasValue && today > contract.EndDate.Value.Date)
                {
                    contract.Status = ContractStatus.Expired;
                    expiredCount++;
                }
            }

            if (activatedCount > 0 || expiredCount > 0)
            {
                await dbContext.SaveChangesAsync(stoppingToken);
                _logger.LogInformation("Contract Status update: {ActivatedCount} activated, {ExpiredCount} expired.", activatedCount, expiredCount);
            }
            else
            {
                _logger.LogInformation("No contracts needed status update.");
            }

            // ─────────────────────────────────────────────────────────────────
            // 3. AUTO GENERATE SCHEDULE FROM CONTRACT
            //    - Run for current year (and next year starting from Oct each year)
            //    - Only creates missing WorkSchedule records (overwrite=false)
            //    - This means xếp ca is fully automatic — no manual action needed
            // ─────────────────────────────────────────────────────────────────
            try
            {
                var currentYear = today.Year;

                // Generate for current year
                var result = await scheduleService.GenerateFromContractAsync(null, currentYear, overwrite: false);
                if (result.ScheduledDays > 0)
                    _logger.LogInformation("Auto-schedule from contract: {Msg}", result.Message);
                else
                    _logger.LogInformation("Auto-schedule: no new schedule days needed for {Year}.", currentYear);

                // From October onwards, pre-generate next year's schedule
                if (today.Month >= 10)
                {
                    var nextYearResult = await scheduleService.GenerateFromContractAsync(null, currentYear + 1, overwrite: false);
                    if (nextYearResult.ScheduledDays > 0)
                        _logger.LogInformation("Auto-schedule next year from contract: {Msg}", nextYearResult.Message);
                }
            }
            catch (Exception ex)
            {
                // Non-critical: log but don't crash the worker
                Console.WriteLine($"[ContractStatusWorker] Auto-schedule warning: {ex.Message}");
            }
        }
    }
}
