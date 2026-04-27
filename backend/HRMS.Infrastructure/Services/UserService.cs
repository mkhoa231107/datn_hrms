using HRMS.Application.DTOs.Users;
using HRMS.Application.Interfaces;
using HRMS.Domain.Entities;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
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

        // ── Helper ──────────────────────────────────────────────
        private static string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(bytes);
        }

        private UserWithRolesDto MapToDto(User u) => new UserWithRolesDto
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
        };

        // ── GET ALL ──────────────────────────────────────────────
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
            return users.Select(MapToDto).OrderByDescending(u => u.Id);
        }

        // ── GET ROLES ────────────────────────────────────────────
        public async Task<IEnumerable<RoleDto>> GetAvailableRolesAsync()
        {
            var roles = await _context.Roles.AsNoTracking().ToListAsync();
            return roles.Select(r => new RoleDto { Id = r.Id, RoleName = r.RoleName, Description = r.Description });
        }

        // ── UPDATE ROLES ─────────────────────────────────────────
        public async Task UpdateUserRolesAsync(int userId, UpdateUserRolesDto dto, string currentUsername)
        {
            var user = await _context.Users.Include(u => u.UserRoles).FirstOrDefaultAsync(u => u.Id == userId)
                       ?? throw new Exception("Không tìm thấy tài khoản người dùng.");

            _context.UserRoles.RemoveRange(user.UserRoles);
            if (dto.RoleIds != null && dto.RoleIds.Any())
            {
                var existingRoleIds = await _context.Roles
                    .Where(r => dto.RoleIds.Contains(r.Id)).Select(r => r.Id).ToListAsync();
                foreach (var roleId in existingRoleIds)
                    _context.UserRoles.Add(new UserRole { UserId = userId, RoleId = roleId, AssignedAt = DateTime.UtcNow, CreatedAt = DateTime.UtcNow });
            }

            _context.AuditLogs.Add(new AuditLog
            {
                UserId = user.Id, Action = "UPDATE_ROLES", EntityType = "UserRole", EntityId = user.Id,
                NewValue = $"Updated roles by {currentUsername}", CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
        }

        // ── CREATE USER ──────────────────────────────────────────
        public async Task<UserWithRolesDto> CreateUserAsync(CreateUserDto dto, string currentUsername)
        {
            if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
                throw new Exception($"Tên tài khoản '{dto.Username}' đã tồn tại.");

            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                throw new Exception($"Email '{dto.Email}' đã được sử dụng bởi tài khoản khác.");

            var user = new User
            {
                Username = dto.Username.Trim(),
                PasswordHash = HashPassword(dto.Password),
                FullName = dto.FullName.Trim(),
                Email = dto.Email.Trim(),
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            if (dto.RoleIds != null && dto.RoleIds.Any())
            {
                var validIds = await _context.Roles.Where(r => dto.RoleIds.Contains(r.Id)).Select(r => r.Id).ToListAsync();
                foreach (var rid in validIds)
                    _context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = rid, AssignedAt = DateTime.UtcNow, CreatedAt = DateTime.UtcNow });
                await _context.SaveChangesAsync();
            }

            _context.AuditLogs.Add(new AuditLog { UserId = user.Id, Action = "CREATE_USER", EntityType = "User", EntityId = user.Id, NewValue = $"Created by {currentUsername}", CreatedAt = DateTime.UtcNow });
            await _context.SaveChangesAsync();

            var created = await _context.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role).FirstAsync(u => u.Id == user.Id);
            return MapToDto(created);
        }

        // ── UPDATE USER INFO ─────────────────────────────────────
        public async Task UpdateUserInfoAsync(int userId, UpdateUserInfoDto dto, string currentUsername)
        {
            var user = await _context.Users.FindAsync(userId)
                       ?? throw new Exception("Không tìm thấy tài khoản.");

            if (!string.IsNullOrWhiteSpace(dto.Email) && dto.Email != user.Email)
            {
                if (await _context.Users.AnyAsync(u => u.Email == dto.Email && u.Id != userId))
                    throw new Exception($"Email '{dto.Email}' đã được sử dụng bởi tài khoản khác.");
                user.Email = dto.Email.Trim();
            }

            if (!string.IsNullOrWhiteSpace(dto.FullName))
                user.FullName = dto.FullName.Trim();

            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        // ── RESET PASSWORD ───────────────────────────────────────
        public async Task ResetUserPasswordAsync(int userId, string newPassword, string currentUsername)
        {
            if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < 6)
                throw new Exception("Mật khẩu mới phải có ít nhất 6 ký tự.");

            var user = await _context.Users.FindAsync(userId)
                       ?? throw new Exception("Không tìm thấy tài khoản.");

            user.PasswordHash = HashPassword(newPassword);
            user.UpdatedAt = DateTime.UtcNow;

            _context.AuditLogs.Add(new AuditLog { UserId = user.Id, Action = "RESET_PASSWORD", EntityType = "User", EntityId = user.Id, NewValue = $"Reset by {currentUsername}", CreatedAt = DateTime.UtcNow });
            await _context.SaveChangesAsync();
        }

        // ── TOGGLE ACTIVE ────────────────────────────────────────
        public async Task ToggleUserActiveAsync(int userId, string currentUsername)
        {
            var user = await _context.Users.FindAsync(userId)
                       ?? throw new Exception("Không tìm thấy tài khoản.");

            user.IsActive = !user.IsActive;
            user.UpdatedAt = DateTime.UtcNow;

            _context.AuditLogs.Add(new AuditLog { UserId = user.Id, Action = user.IsActive ? "ACTIVATE_USER" : "DEACTIVATE_USER", EntityType = "User", EntityId = user.Id, NewValue = $"Toggled by {currentUsername}", CreatedAt = DateTime.UtcNow });
            await _context.SaveChangesAsync();
        }

        // ── DELETE USER ──────────────────────────────────────────
        public async Task DeleteUserAsync(int userId, string currentUsername)
        {
            var user = await _context.Users.Include(u => u.UserRoles).FirstOrDefaultAsync(u => u.Id == userId)
                       ?? throw new Exception("Không tìm thấy tài khoản.");

            _context.UserRoles.RemoveRange(user.UserRoles);
            _context.AuditLogs.Add(new AuditLog { UserId = user.Id, Action = "DELETE_USER", EntityType = "User", EntityId = user.Id, NewValue = $"Deleted by {currentUsername}", CreatedAt = DateTime.UtcNow });
            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
        }
    }
}


