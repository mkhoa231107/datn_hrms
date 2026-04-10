using HRMS.Application.DTOs.Users;
using HRMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace HRMS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllUsers([FromQuery] string search)
        {
            try
            {
                var users = await _userService.GetAllUsersAsync(search);
                return Ok(users);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("roles")]
        public async Task<IActionResult> GetAvailableRoles()
        {
            try
            {
                var roles = await _userService.GetAvailableRolesAsync();
                return Ok(roles);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}/roles")]
        public async Task<IActionResult> UpdateUserRoles(int id, [FromBody] UpdateUserRolesDto dto)
        {
            try
            {
                var currentUsername = User.Identity?.Name ?? "Admin";
                await _userService.UpdateUserRolesAsync(id, dto, currentUsername);
                return Ok(new { message = "Cập nhật quyền thành công." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
