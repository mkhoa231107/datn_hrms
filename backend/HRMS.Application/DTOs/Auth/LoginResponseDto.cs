using System;
using HRMS.Application.DTOs.Common;

namespace HRMS.Application.DTOs.Auth
{
    /// <summary>
    /// DTO for login response containing JWT token and user info
    /// </summary>
    public class LoginResponseDto
    {
        public string Token { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public UserDto User { get; set; } = null!;
    }
}

