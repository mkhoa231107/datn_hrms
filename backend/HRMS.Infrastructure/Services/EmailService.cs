using HRMS.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using System.Threading.Tasks;
using System;

namespace HRMS.Infrastructure.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task SendEmailAsync(string to, string subject, string body)
        {
            var emailSettings = _configuration.GetSection("EmailSettings");
            
            // Check if email sending is enabled
            var enableEmailStr = emailSettings["EnableEmail"];
            bool.TryParse(enableEmailStr, out bool isEmailEnabled);

            if (!isEmailEnabled)
            {
                // Logic giả lập: In ra console nếu không bật gửi email thật
                Console.WriteLine("================================================");
                Console.WriteLine($"[SIMULATED EMAIL] To: {to}");
                Console.WriteLine($"Subject: {subject}");
                Console.WriteLine($"Body: {body}");
                Console.WriteLine("================================================");
                return;
            }

            var senderName = emailSettings["SenderName"] ?? "HRMS System";
            var senderEmail = emailSettings["SenderEmail"];

            if (string.IsNullOrEmpty(senderEmail) || senderEmail == "your-email@gmail.com")
            {
                throw new InvalidOperationException("Email chưa được cấu hình. Vui lòng cập nhật SenderEmail và SenderPassword trong appsettings.json bằng thông tin Gmail thật của bạn.");
            }

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(senderName, senderEmail));
            message.To.Add(new MailboxAddress("", to));
            message.Subject = subject;

            message.Body = new TextPart("html")
            {
                Text = body
            };

            using var client = new SmtpClient();
            try
            {
                // Accept all SSL certificates (for troubleshooting local dev issues)
                client.ServerCertificateValidationCallback = (s, c, h, e) => true;

                Console.WriteLine($"[EMAIL] Connecting to {emailSettings["SmtpServer"] ?? "localhost"}:{emailSettings["SmtpPort"] ?? "587"}...");
                await client.ConnectAsync(
                    emailSettings["SmtpServer"] ?? "localhost", 
                    int.Parse(emailSettings["SmtpPort"] ?? "587"), 
                    SecureSocketOptions.StartTls); // Explicitly use StartTls for port 587

                Console.WriteLine($"[EMAIL] Authenticating as {emailSettings["SenderEmail"] ?? "unknown"}...");
                await client.AuthenticateAsync(emailSettings["SenderEmail"] ?? "", emailSettings["SenderPassword"] ?? "");
                
                Console.WriteLine($"[EMAIL] Sending email to {to}...");
                await client.SendAsync(message);
                
                await client.DisconnectAsync(true);
                Console.WriteLine("[EMAIL] Email sent successfully!");
            }
            catch (Exception ex)
            {
                // Log detailed error
                Console.WriteLine("================================================");
                Console.WriteLine($"[EMAIL FATAL ERROR] To: {to}");
                Console.WriteLine($"Error Message: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Error: {ex.InnerException.Message}");
                }
                Console.WriteLine("================================================");
                throw;
            }
        }
    }
}
