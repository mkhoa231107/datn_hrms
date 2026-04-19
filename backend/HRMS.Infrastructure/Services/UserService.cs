using HRMS.Application.DTOs.Users;
using HRMS.Application.Interfaces;
using HRMS.Domain.Entities;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace HRMS.Infrastructure.Services
{
    public class UserService : IUserService
    {
        private readonly HRMSDbContext _context;

        public UserService(HRMSDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<UserWithRolesDto>> GetAllUsersAsync(string? searchTerm = null)
        {
            var query = _context.Users
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                searchTerm = searchTerm.ToLower();
                query = query.Where(u => 
                    u.Username.ToLower().Contains(searchTerm) || 
                    u.FullName.ToLower().Contains(searchTerm) || 
                    u.Email.ToLower().Contains(searchTerm));
            }

            var users = await query.ToListAsync();

            return users.Select(u => new UserWithRolesDto
            {
                Id = u.Id,
                Username = u.Username,
                FullName = u.FullName ?? u.Username,
                Email = u.Email,
                IsActive = u.IsActive,
                Roles = u.UserRoles.Where(ur => ur.Role != null).Select(ur => new RoleDto
                {
                    Id = ur.Role.Id,
                    RoleName = ur.Role.RoleName,
                    Description = ur.Role.Description
                }).ToList()
            }).OrderByDescending(u => u.Id);
        }

        public async Task<IEnumerable<RoleDto>> GetAvailableRolesAsync()
        {
            var roles = await _context.Roles.AsNoTracking().ToListAsync();
            return roles.Select(r => new RoleDto
            {
                Id = r.Id,
                RoleName = r.RoleName,
                Description = r.Description
            });
        }

        public async Task UpdateUserRolesAsync(int userId, UpdateUserRolesDto dto, string currentUsername)
        {
            var user = await _context.Users
                .Include(u => u.UserRoles)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new Exception("Không tìm thấy tài khoản người dùng.");
            }

            // Remove existing roles
            _context.UserRoles.RemoveRange(user.UserRoles);

            // Add new roles
            if (dto.RoleIds != null && dto.RoleIds.Any())
            {
                // Verify the roles exist
                var existingRoleIds = await _context.Roles
                    .Where(r => dto.RoleIds.Contains(r.Id))
                    .Select(r => r.Id)
                    .ToListAsync();

                foreach (var roleId in existingRoleIds)
                {
                    _context.UserRoles.Add(new UserRole
                    {
                        UserId = userId,
                        RoleId = roleId,
                        AssignedAt = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            // Optional: Log the activity
            _context.AuditLogs.Add(new AuditLog
            {
                UserId = user.Id,
                Action = "UPDATE_ROLES",
                EntityType = "UserRole",
                EntityId = user.Id,
                NewValue = $"Updated roles by {currentUsername}",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
        }
    }
}
