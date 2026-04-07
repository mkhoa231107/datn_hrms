using AutoMapper;
using HRMS.Application.DTOs.Auth;
using HRMS.Application.DTOs.Common;
using HRMS.Application.Interfaces;
using HRMS.Domain.Entities;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace HRMS.Infrastructure.Services
{
    public class AuthService : IAuthService
    {
        private readonly HRMSDbContext _context;
        private readonly IMapper _mapper;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;

        public AuthService(HRMSDbContext context, IMapper mapper, IConfiguration configuration, IEmailService emailService)
        {
            _context = context;
            _mapper = mapper;
            _configuration = configuration;
            _emailService = emailService;
        }

        public async Task<LoginResponseDto> LoginAsync(LoginRequestDto request)
        {
            var user = await _context.Users
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .Include(u => u.Employee)
                    .ThenInclude(e => e.Department)
                .FirstOrDefaultAsync(u => u.Username == request.Username);

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                throw new UnauthorizedAccessException("Invalid username or password");
            }

            if (!user.IsActive)
            {
                throw new UnauthorizedAccessException("User account is inactive");
            }

            var token = GenerateJwtToken(user);
            var expiryMinutes = int.Parse(_configuration["Jwt:ExpiryMinutes"]);
            var userDto = _mapper.Map<UserDto>(user);

            return new LoginResponseDto
            {
                Token = token,
                ExpiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes),
                User = userDto
            };
        }

        public async Task<LoginResponseDto> RegisterAsync(RegisterRequestDto request)
        {
            if (await _context.Users.AnyAsync(u => u.Username == request.Username))
                throw new InvalidOperationException("Tên đăng nhập đã tồn tại");

            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
                throw new InvalidOperationException("Email đã tồn tại");

            var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Candidate");
            if (role == null) throw new InvalidOperationException("Role Candidate chưa được khởi tạo");

            var user = new User
            {
                Username = request.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Email = request.Email,
                FullName = request.FullName,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var userRole = new UserRole
            {
                UserId = user.Id,
                RoleId = role.Id,
                AssignedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            _context.UserRoles.Add(userRole);
            await _context.SaveChangesAsync();

            // Re-fetch user with includes for token generation
            var fullUser = await _context.Users
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .Include(u => u.Employee)
                    .ThenInclude(e => e.Department)
                .FirstOrDefaultAsync(u => u.Id == user.Id);

            var token = GenerateJwtToken(fullUser);
            var expiryMinutes = int.Parse(_configuration["Jwt:ExpiryMinutes"] ?? "60");
            var userDto = _mapper.Map<UserDto>(fullUser);

            return new LoginResponseDto
            {
                Token = token,
                ExpiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes),
                User = userDto
            };
        }

        public async Task<UserDto> GetCurrentUserAsync(int userId)
        {
            var user = await _context.Users
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .Include(u => u.Employee)
                    .ThenInclude(e => e.Department)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new InvalidOperationException("User not found");
            }

            return _mapper.Map<UserDto>(user);
        }

        public async Task ForgotPasswordAsync(string username)
        {
            var user = await _context.Users
                .Include(u => u.Employee)
                .FirstOrDefaultAsync(u => u.Username == username);

            if (user == null)
                throw new InvalidOperationException("User not found");

            if (user.Employee == null || string.IsNullOrEmpty(user.Employee.PersonalEmail))
                throw new InvalidOperationException("User does not have a personal email registered for password recovery");

            // Generate 6-digit OTP
            var otpCode = new Random().Next(100000, 999999).ToString();
            
            // Deactivate any previous OTPs for this user
            var oldOtps = await _context.PasswordResetOTPs
                .Where(o => o.UserId == user.Id && !o.IsUsed)
                .ToListAsync();
            foreach (var old in oldOtps) old.IsUsed = true;

            var otp = new PasswordResetOTP
            {
                UserId = user.Id,
                OTPCode = otpCode,
                ExpiryTime = DateTime.UtcNow.AddMinutes(15),
                IsUsed = false
            };

            _context.PasswordResetOTPs.Add(otp);
            await _context.SaveChangesAsync();

            // Send Email
            string subject = "Ma xac thuc doi mat khau - HRMS";
            string body = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;'>
                    <h2 style='color: #4F46E5; text-align: center;'>Password Reset Request</h2>
                    <p>Hello <strong>{user.FullName}</strong>,</p>
                    <p>You have requested to reset your password. Please use the following OTP code to proceed:</p>
                    <div style='background-color: #F3F4F6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #111827; border-radius: 8px; margin: 20px 0;'>
                        {otpCode}
                    </div>
                    <p style='color: #6B7280; font-size: 14px;'>This code will expire in 15 minutes. If you did not request this, please ignore this email.</p>
                    <hr style='border: 0; border-top: 1px solid #eee; margin: 20px 0;'>
                    <p style='text-align: center; color: #9CA3AF; font-size: 12px;'>HRMS - Advanced Human Resource Management System</p>
                </div>";

            await _emailService.SendEmailAsync(user.Employee.PersonalEmail, subject, body);
        }

        public async Task<bool> VerifyOTPAsync(string username, string otpCode)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null) return false;

            var otp = await _context.PasswordResetOTPs
                .FirstOrDefaultAsync(o => o.UserId == user.Id && 
                                          o.OTPCode == otpCode && 
                                          !o.IsUsed && 
                                          o.ExpiryTime > DateTime.UtcNow);

            return otp != null;
        }

        public async Task ResetPasswordAsync(ForgotPasswordResetDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.Username);
            if (user == null) throw new InvalidOperationException("User not found");

            var otp = await _context.PasswordResetOTPs
                .FirstOrDefaultAsync(o => o.UserId == user.Id && 
                                          o.OTPCode == request.OTPCode && 
                                          !o.IsUsed && 
                                          o.ExpiryTime > DateTime.UtcNow);

            if (otp == null)
                throw new InvalidOperationException("Invalid or expired OTP code");

            // Update Password
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;

            // Mark OTP as used
            otp.IsUsed = true;

            await _context.SaveChangesAsync();
        }

        private string GenerateJwtToken(User user)
        {
            var securityKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_configuration["Jwt:SecretKey"] ?? "vBN6pQ8rX2t5v8y/B?E(G+KbPeShVmYq"));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim("id", user.Id.ToString()),
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim("OrganizationId", user.Employee?.OrganizationId.ToString() ?? "0"),
                new Claim("EmployeeId", user.Employee?.Id.ToString() ?? "0"),
                new Claim("DepartmentId", user.Employee?.DepartmentId.ToString() ?? "0"),
                new Claim("DepartmentCode", user.Employee?.Department?.DepartmentCode ?? "NONE")
            };

            foreach (var userRole in user.UserRoles)
            {
                claims.Add(new Claim(ClaimTypes.Role, userRole.Role.RoleName));
            }

            var expiryMinutesStr = _configuration["Jwt:ExpiryMinutes"] ?? "60";
            var expiryMinutes = int.TryParse(expiryMinutesStr, out int minutes) ? minutes : 60;
            
            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"] ?? "HRMS_API",
                audience: _configuration["Jwt:Audience"] ?? "HRMS_Client",
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
