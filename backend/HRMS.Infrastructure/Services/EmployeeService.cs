using AutoMapper;
using HRMS.Application.DTOs.Employees;
using HRMS.Application.Interfaces;
using HRMS.Domain.Entities;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;


namespace HRMS.Infrastructure.Services
{
    public class EmployeeService : IEmployeeService
    {
        private readonly HRMSDbContext _context;
        private readonly IMapper _mapper;

        public EmployeeService(HRMSDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<EmployeeProfileDto> GetMyProfileAsync(int userId)
        {
            var employee = await _context.Employees
                .Include(e => e.Department)
                .Include(e => e.Position)
                .Include(e => e.Contracts)
                .Include(e => e.BankAccounts)
                .Include(e => e.EmergencyContacts)
                .FirstOrDefaultAsync(e => e.UserId == userId);

            if (employee == null)
            {
                throw new InvalidOperationException("Hồ sơ nhân viên không tồn tại");
            }

            return MapToProfileDto(employee);
        }

        public async Task<EmployeeProfileDto> GetEmployeeProfileAsync(int employeeId, string[]? requesterRoles = null)
        {
            var employee = await _context.Employees
                .Include(e => e.Department)
                .Include(e => e.Position)
                .Include(e => e.Contracts)
                .Include(e => e.BankAccounts)
                .Include(e => e.EmergencyContacts)
                .Include(e => e.User)
                    .ThenInclude(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(e => e.Id == employeeId);

            if (employee == null)
            {
                throw new InvalidOperationException("Hồ sơ nhân viên không tồn tại");
            }

            // Bảo mật: Trưởng phòng không được xem profile của Admin
            if (requesterRoles != null && 
                requesterRoles.Contains("DepartmentManager") && 
                !requesterRoles.Contains("Admin") && 
                !requesterRoles.Contains("HrAdmin"))
            {
                if (employee.User != null && employee.User.UserRoles.Any(ur => ur.Role.RoleName == "Admin"))
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền xem hồ sơ của Quản trị viên.");
                }
            }

            return MapToProfileDto(employee);
        }

        private EmployeeProfileDto MapToProfileDto(Employee employee)
        {
            var profileDto = _mapper.Map<EmployeeProfileDto>(employee);
            
            // Map current active contract if any
            var activeContract = employee.Contracts.FirstOrDefault(c => c.IsActive);
            if (activeContract != null)
            {
                profileDto.CurrentContract = _mapper.Map<EmployeeContractDto>(activeContract);
            }

            return profileDto;
        }

        public async Task UpdateMyProfileAsync(int userId, EmployeeUpdateDto dto)
        {
            var employee = await _context.Employees
                .FirstOrDefaultAsync(e => e.UserId == userId);

            if (employee == null)
            {
                throw new InvalidOperationException("Hồ sơ nhân viên không tồn tại");
            }

            // Chỉ cập nhật các trường được phép cho bản thân
            employee.PersonalEmail = dto.PersonalEmail ?? employee.PersonalEmail;
            employee.Phone = dto.Phone ?? employee.Phone;
            employee.Address = dto.Address ?? employee.Address;
            employee.CurrentAddress = dto.CurrentAddress ?? employee.CurrentAddress;
            employee.Avatar = dto.Avatar ?? employee.Avatar;
            employee.PlaceOfOrigin = dto.PlaceOfOrigin ?? employee.PlaceOfOrigin;
            employee.Ethnicity = dto.Ethnicity ?? employee.Ethnicity;
            employee.Religion = dto.Religion ?? employee.Religion;
            employee.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        public async Task UpdateEmployeeAsync(int id, EmployeeUpdateDto dto)
        {
            var employee = await _context.Employees
                .FirstOrDefaultAsync(e => e.Id == id);

            if (employee == null)
            {
                throw new InvalidOperationException("Hồ sơ nhân viên không tồn tại");
            }

            // Cập nhật tất cả các trường từ DTO
            employee.FullName = dto.FullName ?? employee.FullName;
            employee.DateOfBirth = dto.DateOfBirth ?? employee.DateOfBirth;
            employee.Gender = dto.Gender ?? employee.Gender;
            employee.PlaceOfOrigin = dto.PlaceOfOrigin ?? employee.PlaceOfOrigin;
            employee.Ethnicity = dto.Ethnicity ?? employee.Ethnicity;
            employee.Religion = dto.Religion ?? employee.Religion;
            employee.IdentityNumber = dto.IdentityNumber ?? employee.IdentityNumber;
            employee.IdentityDate = dto.IdentityDate ?? employee.IdentityDate;
            employee.IdentityPlace = dto.IdentityPlace ?? employee.IdentityPlace;
            employee.IdentityExpirationDate = dto.IdentityExpirationDate ?? employee.IdentityExpirationDate;
            employee.PersonalEmail = dto.PersonalEmail ?? employee.PersonalEmail;
            employee.Phone = dto.Phone ?? employee.Phone;
            employee.Address = dto.Address ?? employee.Address;
            employee.CurrentAddress = dto.CurrentAddress ?? employee.CurrentAddress;
            employee.Avatar = dto.Avatar ?? employee.Avatar;
            employee.IsActive = dto.IsActive ?? employee.IsActive;

            employee.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<EmployeeSummaryDto>> GetAllEmployeesAsync(int? departmentId = null)
        {
            var query = _context.Employees
                .Include(e => e.Position)
                .Include(e => e.Department)
                .Include(e => e.User)
                    .ThenInclude(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                .AsQueryable();

            if (departmentId.HasValue)
            {
                // Nếu lọc theo phòng ban (thường là Trưởng phòng), loại bỏ những người có Role 'Admin'
                query = query.Where(e => e.DepartmentId == departmentId.Value && 
                                        !e.User.UserRoles.Any(ur => ur.Role.RoleName == "Admin"));
            }

            var employees = await query
                .Select(e => new EmployeeSummaryDto
                {
                    Id = e.Id,
                    EmployeeCode = e.EmployeeCode,
                    FullName = e.FullName,
                    PositionName = e.Position != null ? e.Position.PositionName : string.Empty,
                    DepartmentName = e.Department != null ? e.Department.DepartmentName : string.Empty,
                    DepartmentId = e.DepartmentId,
                    Email = e.Email,
                    PersonalEmail = e.PersonalEmail,
                    Phone = e.Phone,
                    Avatar = e.Avatar,
                    Gender = e.Gender,
                    Ethnicity = e.Ethnicity,
                    Religion = e.Religion,
                    IdentityNumber = e.IdentityNumber,
                    IsActive = e.IsActive,
                    HasFaceDescriptor = e.FaceDescriptor != null && e.FaceDescriptor != string.Empty
                })
                .ToListAsync();

            return employees;
        }

        public async Task<int> CreateEmployeeAsync(EmployeeCreateDto dto)
        {
            // 1. Kiểm tra email/username đã tồn tại chưa
            var username = dto.Email.Split('@')[0].ToLower();
            if (await _context.Users.AnyAsync(u => u.Username == username))
            {
                // Nếu trùng username, thêm mã nhân viên vào sau để tránh trùng lặp
                username = $"{username}_{dto.EmployeeCode.ToLower()}";
            }

            // 2. Tạo tài khoản User tự động
            var user = new User
            {
                Username = username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"), // Mật khẩu mặc định
                Email = dto.Email,
                FullName = dto.FullName,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // 3. Gán Role 'Employee' cho user mới
            var employeeRole = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Employee");
            if (employeeRole != null)
            {
                _context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = employeeRole.Id });
            }

            // 4. Tạo bản ghi Employee
            var employee = _mapper.Map<Employee>(dto);
            employee.UserId = user.Id;
            employee.CreatedAt = DateTime.UtcNow;

            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();

            return employee.Id;
        }
        public async Task SaveFaceDescriptorAsync(int employeeId, string descriptor)
        {
            var employee = await _context.Employees.FindAsync(employeeId)
                ?? throw new InvalidOperationException("Không tìm thấy nhân viên.");
            employee.FaceDescriptor = descriptor;
            employee.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<FaceDescriptorResultDto>> GetAllFaceDescriptorsAsync()
        {
            return await _context.Employees
                .Where(e => e.FaceDescriptor != null)
                .Select(e => new FaceDescriptorResultDto
                {
                    EmployeeId = e.Id,
                    FullName = e.FullName,
                    Descriptor = e.FaceDescriptor
                })
                .ToListAsync();
        }
    }
}
