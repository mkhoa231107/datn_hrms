using AutoMapper;
using HRMS.Application.DTOs.Audit;
using HRMS.Application.Interfaces;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace HRMS.Infrastructure.Services
{
    public class AuditLogService : IAuditLogService
    {
        private readonly HRMSDbContext _context;

        public AuditLogService(HRMSDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<AuditLogDto>> GetDepartmentActivitiesAsync(int departmentId)
        {
            // Join AuditLog -> User -> Employee to filter by Department
            // Also include sub-departments for managers
            var managedDeptIds = await _context.Departments
                .Where(d => d.Id == departmentId || d.ParentDepartmentId == departmentId)
                .Select(d => d.Id)
                .ToListAsync();

            var logs = await _context.AuditLogs
                .Include(l => l.User)
                    .ThenInclude(u => u.Employee)
                        .ThenInclude(e => e.Department)
                .Include(l => l.User)
                    .ThenInclude(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                .Where(l => l.User.Employee != null && (l.User.Employee.DepartmentId == departmentId || l.User.Employee.Department.ParentDepartmentId == departmentId)
                            && !l.User.UserRoles.Any(ur => ur.Role.RoleName == "Admin" || ur.Role.RoleName == "HrAdmin"))
                .OrderByDescending(l => l.CreatedAt)
                .Take(100)
                .Select(l => new AuditLogDto
                {
                    Id = l.Id,
                    UserId = l.UserId,
                    UserFullName = l.User.Employee.FullName,
                    UserRoleName = l.User.UserRoles.OrderBy(ur => ur.Role.Id).Select(ur => ur.Role.RoleName).FirstOrDefault(),
                    UserDepartmentName = l.User.Employee.Department.DepartmentName,
                    Action = l.Action,
                    EntityType = l.EntityType,
                    EntityId = l.EntityId,
                    OldValue = l.OldValue,
                    NewValue = l.NewValue,
                    IpAddress = l.IpAddress,
                    CreatedAt = l.CreatedAt
                })
                .ToListAsync();

            return logs;
        }



        public async Task<IEnumerable<AuditLogDto>> GetRecentLogsAsync(int count = 50)
        {
            return await _context.AuditLogs
                .Include(l => l.User)
                    .ThenInclude(u => u.Employee)
                .OrderByDescending(l => l.CreatedAt)
                .Take(count)
                .Select(l => new AuditLogDto
                {
                    Id = l.Id,
                    UserId = l.UserId,
                    UserFullName = l.User.Employee.FullName,
                    Action = l.Action,
                    EntityType = l.EntityType,
                    EntityId = l.EntityId,
                    IpAddress = l.IpAddress,
                    CreatedAt = l.CreatedAt
                })
                .ToListAsync();
        }
    }
}
