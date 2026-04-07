namespace HRMS.Application.DTOs.Auth
{
    public class ForgotPasswordResetDto
    {
        public string Username { get; set; }
        public string OTPCode { get; set; }
        public string NewPassword { get; set; }
    }

    public class ForgotPasswordRequest
    {
        public string Username { get; set; }
    }

    public class VerifyOtpRequest
    {
        public string Username { get; set; }
        public string OTPCode { get; set; }
    }
}
