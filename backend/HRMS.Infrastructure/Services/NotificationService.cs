using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HRMS.Application.DTOs.Notification;
using HRMS.Application.Interfaces;
using HRMS.Domain.Entities;
using HRMS.Infrastructure.Data;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace HRMS.Infrastructure.Services
{
    /// <summary>
    /// Marker hub interface so Infrastructure doesn't need to reference HRMS.API
    /// </summary>
    public interface IHrmsHubMarker { }

    public class NotificationService : INotificationService
    {
        private readonly HRMSDbContext _context;
        private readonly IHubContext<HrmsHubProxy> _hubContext;

        public NotificationService(HRMSDbContext context, IHubContext<HrmsHubProxy> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        public async Task<List<NotificationDto>> GetMyNotificationsAsync(int employeeId)
        {
            var notifications = await _context.Notifications
                .Where(n => n.EmployeeId == employeeId)
                .OrderByDescending(n => n.CreatedAt)
                .Take(50)
                .ToListAsync();

            return notifications.Select(n => new NotificationDto
            {
                Id = n.Id,
                Title = n.Title,
                Message = n.Message,
                Type = n.Type,
                Status = n.Status,
                RelatedId = n.RelatedId,
                CreatedAt = n.CreatedAt,
                ReadAt = n.ReadAt
            }).ToList();
        }

        public async Task<bool> CreateNotificationAsync(CreateNotificationDto dto)
        {
            try
            {
                var notification = new Notification
                {
                    EmployeeId = dto.EmployeeId,
                    Title = dto.Title,
                    Message = dto.Message,
                    Type = dto.Type,
                    RelatedId = dto.RelatedId,
                    Status = "Unread",
                    CreatedAt = DateTime.UtcNow
                };

                _context.Notifications.Add(notification);
                await _context.SaveChangesAsync();

                // 🔔 Push real-time notification to specific employee's SignalR group
                var notifDto = new NotificationDto
                {
                    Id = notification.Id,
                    Title = notification.Title,
                    Message = notification.Message,
                    Type = notification.Type,
                    Status = notification.Status,
                    RelatedId = notification.RelatedId,
                    CreatedAt = notification.CreatedAt,
                    ReadAt = notification.ReadAt
                };
                await _hubContext.Clients.Group($"employee_{dto.EmployeeId}")
                    .SendAsync("ReceiveNotification", notifDto);

                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }

        public async Task<bool> MarkAsReadAsync(int notificationId, int employeeId)
        {
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.Id == notificationId && n.EmployeeId == employeeId);

            if (notification == null) return false;

            notification.Status = "Read";
            notification.ReadAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> MarkAllAsReadAsync(int employeeId)
        {
            var unread = await _context.Notifications
                .Where(n => n.EmployeeId == employeeId && n.Status == "Unread")
                .ToListAsync();

            foreach (var n in unread)
            {
                n.Status = "Read";
                n.ReadAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return true;
        }
    }

    /// <summary>
    /// Proxy Hub class in Infrastructure layer to avoid circular dependency with HRMS.API
    /// The actual Hub in HRMS.API.Hubs.HrmsHub inherits from this
    /// </summary>
    public class HrmsHubProxy : Hub { }
}
