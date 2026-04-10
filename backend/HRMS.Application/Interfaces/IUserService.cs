using HRMS.Application.DTOs.Users;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HRMS.Application.Interfaces
{
    public interface IUserService
    {
        Task<IEnumerable<UserWithRolesDto>> GetAllUsersAsync(string searchTerm = null);
        Task<IEnumerable<RoleDto>> GetAvailableRolesAsync();
        Task UpdateUserRolesAsync(int userId, UpdateUserRolesDto dto, string currentUsername);
    }
}
