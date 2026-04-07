using System;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Entity for storing password reset OTP codes
    /// </summary>
    public class PasswordResetOTP
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public User User { get; set; }
        
        public string OTPCode { get; set; }
        public DateTime ExpiryTime { get; set; }
        public bool IsUsed { get; set; } = false;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
