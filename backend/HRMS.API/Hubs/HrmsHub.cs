using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using HRMS.Infrastructure.Services;

namespace HRMS.API.Hubs
{
    /// <summary>
    /// Main SignalR Hub - inherits from HrmsHubProxy so IHubContext<HrmsHubProxy>
    /// can be used in Infrastructure without circular dependency.
    /// </summary>
    [Authorize]
    public class HrmsHub : HrmsHubProxy
    {
        public override async Task OnConnectedAsync()
        {
            var employeeId = Context.User?.FindFirst("EmployeeId")?.Value;
            var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value;
            var departmentId = Context.User?.FindFirst("DepartmentId")?.Value;

            // Personal group: nhận thông báo cá nhân
            if (!string.IsNullOrEmpty(employeeId))
                await Groups.AddToGroupAsync(Context.ConnectionId, $"employee_{employeeId}");

            // Role group: broadcast theo role
            if (!string.IsNullOrEmpty(role))
                await Groups.AddToGroupAsync(Context.ConnectionId, $"role_{role}");

            // Department group
            if (!string.IsNullOrEmpty(departmentId))
                await Groups.AddToGroupAsync(Context.ConnectionId, $"dept_{departmentId}");

            // Managers group (CnB, Admin, DeptManager)
            if (role == "Admin" || role == "CnbSpecialist" || role == "DepartmentManager")
                await Groups.AddToGroupAsync(Context.ConnectionId, "managers");

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await base.OnDisconnectedAsync(exception);
        }
    }
}
