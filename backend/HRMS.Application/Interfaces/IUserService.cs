using HRMS.Application.DTOs.Users;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HRMS.Application.Interfaces
{
    public interface IUserService
    {
        Task<IEnumerable<UserWithRolesDto>> GetAllUsersAsync(string? searchTerm = null);
        Task<IEnumerable<RoleDto>> GetAvailableRolesAsync();
        Task UpdateUserRolesAsync(int userId, UpdateUserRolesDto dto, string currentUsername);
        Task<UserWithRolesDto> CreateUserAsync(CreateUserDto dto, string currentUsername);
        Task UpdateUserInfoAsync(int userId, UpdateUserInfoDto dto, string currentUsername);
        Task ResetUserPasswordAsync(int userId, string newPassword, string currentUsername);
        Task ToggleUserActiveAsync(int userId, string currentUsername);
        Task DeleteUserAsync(int userId, string currentUsername);
    }
}
