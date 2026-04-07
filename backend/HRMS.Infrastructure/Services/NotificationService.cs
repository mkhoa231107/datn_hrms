using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HRMS.Application.DTOs.Notification;
using HRMS.Application.Interfaces;
using HRMS.Domain.Entities;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HRMS.Infrastructure.Services
{
    public class NotificationService : INotificationService
    {
        private readonly HRMSDbContext _context;

        public NotificationService(HRMSDbContext context)
        {
            _context = context;
        }

        public async Task<List<NotificationDto>> GetMyNotificationsAsync(int employeeId)
        {
            var notifications = await _context.Notifications
                .Where(n => n.EmployeeId == employeeId)
                .OrderByDescending(n => n.CreatedAt)
                .Take(50) // Limit to last 50
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
}
