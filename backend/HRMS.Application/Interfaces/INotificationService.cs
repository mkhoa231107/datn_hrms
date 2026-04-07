using System.Collections.Generic;
using System.Threading.Tasks;
using HRMS.Application.DTOs.Notification;

namespace HRMS.Application.Interfaces
{
    public interface INotificationService
    {
        Task<List<NotificationDto>> GetMyNotificationsAsync(int employeeId);
        Task<bool> CreateNotificationAsync(CreateNotificationDto dto);
        Task<bool> MarkAsReadAsync(int notificationId, int employeeId);
        Task<bool> MarkAllAsReadAsync(int employeeId);
    }
}
