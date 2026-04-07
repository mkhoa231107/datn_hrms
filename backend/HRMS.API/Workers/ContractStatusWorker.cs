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
                    _logger.LogError(ex, "Error occurred executing ContractStatusWorker.");
                }

                // Run once a day at midnight.
                var now = DateTime.Now;
                var nextMidnight = now.Date.AddDays(1);
                var delay = nextMidnight - now;
                
                _logger.LogInformation("Contract Status Worker is sleeping until {NextMidnight}.", nextMidnight);
                
                // CancellationToken is monitored during Task.Delay
                await Task.Delay(delay, stoppingToken);
            }
        }

        private async Task ProcessContractsAsync(CancellationToken stoppingToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<HRMSDbContext>();
            var today = DateTime.UtcNow.Date;
            
            _logger.LogInformation("Processing contracts for date: {Today}", today);

            // 1. WaitingSign -> Active (Neu Today >= StartDate)
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

            // 2. Active -> Expired (Neu Today > EndDate)
            var activeContracts = await dbContext.EmployeeContracts
                .Where(c => c.Status == ContractStatus.Active && c.EndDate != null)
                .ToListAsync(stoppingToken);

            int expiredCount = 0;
            foreach (var contract in activeContracts)
            {
                if (today > contract.EndDate.Value.Date)
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
        }
    }
}
