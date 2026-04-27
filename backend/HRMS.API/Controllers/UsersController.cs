using HRMS.Application.DTOs.Users;
using HRMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace HRMS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,CnbSpecialist")]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        private string GetCurrentUsername() => User.FindFirst(ClaimTypes.Name)?.Value
            ?? User.FindFirst("username")?.Value ?? "Unknown";

        // ── GET ALL USERS ────────────────────────────────────────
        [HttpGet]
        public async Task<IActionResult> GetAllUsers([FromQuery] string? search)
        {
            try
            {
                var users = await _userService.GetAllUsersAsync(search);
                return Ok(users);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // ── GET AVAILABLE ROLES ──────────────────────────────────
        [HttpGet("roles")]
        public async Task<IActionResult> GetAvailableRoles()
        {
            try
            {
                var roles = await _userService.GetAvailableRolesAsync();
                return Ok(roles);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // ── CREATE USER ──────────────────────────────────────────
        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
        {
            try
            {
                var created = await _userService.CreateUserAsync(dto, GetCurrentUsername());
                return Ok(new { message = "Tạo tài khoản thành công.", data = created });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // ── UPDATE USER INFO ─────────────────────────────────────
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUserInfo(int id, [FromBody] UpdateUserInfoDto dto)
        {
            try
            {
                await _userService.UpdateUserInfoAsync(id, dto, GetCurrentUsername());
                return Ok(new { message = "Cập nhật thông tin tài khoản thành công." });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // ── UPDATE ROLES ─────────────────────────────────────────
        [HttpPut("{id}/roles")]
        public async Task<IActionResult> UpdateUserRoles(int id, [FromBody] UpdateUserRolesDto dto)
        {
            try
            {
                await _userService.UpdateUserRolesAsync(id, dto, GetCurrentUsername());
                return Ok(new { message = "Cập nhật quyền thành công." });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // ── RESET PASSWORD ───────────────────────────────────────
        [HttpPost("{id}/reset-password")]
        public async Task<IActionResult> ResetPassword(int id, [FromBody] ResetPasswordDto dto)
        {
            try
            {
                await _userService.ResetUserPasswordAsync(id, dto.NewPassword, GetCurrentUsername());
                return Ok(new { message = "Đặt lại mật khẩu thành công." });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // ── TOGGLE ACTIVE ────────────────────────────────────────
        [HttpPost("{id}/toggle-active")]
        public async Task<IActionResult> ToggleActive(int id)
        {
            try
            {
                await _userService.ToggleUserActiveAsync(id, GetCurrentUsername());
                return Ok(new { message = "Đã thay đổi trạng thái tài khoản." });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // ── DELETE USER ──────────────────────────────────────────
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            try
            {
                // Prevent self-deletion
                var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                if (currentUserId == id)
                    return BadRequest(new { message = "Bạn không thể xóa tài khoản của chính mình." });

                await _userService.DeleteUserAsync(id, GetCurrentUsername());
                return Ok(new { message = "Đã xóa tài khoản thành công." });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }
    }

    public class ResetPasswordDto
    {
        public string NewPassword { get; set; } = string.Empty;
    }
}
