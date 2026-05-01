using System.ComponentModel.DataAnnotations;

namespace HRMS.Application.DTOs.Auth
{
    /// <summary>
    /// DTO for login request
    /// </summary>
    public class LoginRequestDto
    {
        [Required(ErrorMessage = "Username is required")]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required")]
        public string Password { get; set; } = string.Empty;
    }
}

