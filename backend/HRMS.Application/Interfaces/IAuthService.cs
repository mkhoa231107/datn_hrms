using HRMS.Application.DTOs.Auth;
using HRMS.Application.DTOs.Common;
using System.Threading.Tasks;

namespace HRMS.Application.Interfaces
{
    /// <summary>
    /// Interface for authentication and user management services
    /// </summary>
    public interface IAuthService
    {
        /// <summary>
        /// Authenticate user and generate JWT token
        /// </summary>
        /// <param name="request">Login credentials</param>
        /// <returns>JWT token and user information</returns>
        Task<LoginResponseDto> LoginAsync(LoginRequestDto request);

        /// <summary>
        /// Register a new user as a Candidate
        /// </summary>
        Task<LoginResponseDto> RegisterAsync(RegisterRequestDto request);



        /// <summary>
        /// Get current user information by user ID
        /// </summary>
        /// <param name="userId">User ID from JWT claims</param>
        /// <returns>User information</returns>
        Task<UserDto> GetCurrentUserAsync(int userId);

        /// <summary>
        /// Request a password reset OTP
        /// </summary>
        Task ForgotPasswordAsync(string username);

        Task<bool> VerifyOTPAsync(string username, string otpCode);

        /// <summary>
        /// Reset password using OTP
        /// </summary>
        Task ResetPasswordAsync(ForgotPasswordResetDto request);
    }
}
