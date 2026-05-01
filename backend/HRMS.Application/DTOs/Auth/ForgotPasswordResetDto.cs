namespace HRMS.Application.DTOs.Auth
{
    public class ForgotPasswordResetDto
    {
        public string Username { get; set; } = string.Empty;
        public string OTPCode { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    public class ForgotPasswordRequest
    {
        public string Username { get; set; } = string.Empty;
    }

    public class VerifyOtpRequest
    {
        public string Username { get; set; } = string.Empty;
        public string OTPCode { get; set; } = string.Empty;
    }
}

