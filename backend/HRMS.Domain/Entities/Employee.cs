using System;
using System.Collections.Generic;
using HRMS.Domain.Enums;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Employee entity - Nhân viên
    /// Core HR profile linked to User account (1:1)
    /// </summary>
    public class Employee
    {
        public int Id { get; set; }
        
        // Basic Information
        public string EmployeeCode { get; set; }    // Mã nhân viên (VD: NV001)
        public string FullName { get; set; }        // Họ và tên đầy đủ
        public DateTime DateOfBirth { get; set; }   // Ngày sinh
        public string Gender { get; set; }          // Giới tính: "Nam", "Nữ", "Khác"
        public string? PlaceOfOrigin { get; set; }  // Quê quán
        public string? PlaceOfBirth { get; set; }   // Nơi sinh
        public string? Ethnicity { get; set; }      // Dân tộc
        public string? Religion { get; set; }       // Tôn giáo
        public string? IdentityNumber { get; set; }  // CMND/CCCD
        public DateTime? IdentityDate { get; set; } // Ngày cấp CMND
        public string? IdentityPlace { get; set; }   // Nơi cấp CMND
        public DateTime? IdentityExpirationDate { get; set; } // Ngày hết hạn CMND/CCCD
        
        // Contact Information
        public string Email { get; set; }
        public string? PersonalEmail { get; set; }  // Email cá nhân (để nhận OTP/Reset password)
        public string Phone { get; set; }
        public string Address { get; set; }         // Địa chỉ thường trú
        public string? CurrentAddress { get; set; }  // Địa chỉ tạm trú
        
        // Employment Information
        public DateTime JoinDate { get; set; }      // Ngày vào làm
        public DateTime? LeaveDate { get; set; }    // Ngày nghỉ việc
        public EmployeeStatus Status { get; set; } = EmployeeStatus.Probation;
        public bool IsActive { get; set; } = true; // Đang làm việc / Nghỉ việc
        
        // Organization relationships
        public int OrganizationId { get; set; }
        public Organization Organization { get; set; }
        
        public int DepartmentId { get; set; }
        public Department Department { get; set; }
        
        public int PositionId { get; set; }
        public Position Position { get; set; }

        public decimal BasicSalary { get; set; }    // Lương cơ bản hiện tại (đồng bộ từ hợp đồng)
        public decimal Coefficient { get; set; } = 1.0m; // Hệ số lương (Nếu > 0 sẽ ghi đè chức vụ)
        
        // Allowance Overrides (Nếu có giá trị sẽ ghi đè cấu hình chức vụ)
        public decimal? MealAllowance { get; set; }
        public decimal? PhoneAllowance { get; set; }
        public decimal? PetrolAllowance { get; set; }
        public decimal? HousingAllowance { get; set; }
        
        public int? ShiftId { get; set; }           // Ca làm việc cố định hiện tại (đồng bộ từ hợp đồng)
        public WorkShift? Shift { get; set; }
        
        // Manager relationship (self-referencing)
        public int? ManagerId { get; set; }
        public Employee Manager { get; set; }
        public ICollection<Employee> Subordinates { get; set; }
        
        // User account relationship (1:1)
        public int? UserId { get; set; }
        public User User { get; set; }
        
        // Additional info
        public string? Avatar { get; set; }          // URL ảnh đại diện
        public string? TaxCode { get; set; }         // Mã số thuế cá nhân
        public string? SocialInsuranceNumber { get; set; } // Số sổ BHXH
        public string? FaceDescriptor { get; set; }  // JSON of face recognition descriptor (128-dim float array)
        
        // Payroll Information
        public int NumberOfDependents { get; set; } = 0; // Số người phụ thuộc
        public decimal? InsuranceSalary { get; set; }    // Mức lương đóng bảo hiểm (nếu khác Gross)
        public string? Signature { get; set; }       // Digital signature Base64
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation properties
        public ICollection<EmployeeContract> Contracts { get; set; }
        public ICollection<EmployeeBankAccount> BankAccounts { get; set; }
        public ICollection<EmployeeEmergencyContact> EmergencyContacts { get; set; }
        public ICollection<Department> ManagedDepartments { get; set; }
        public ICollection<EmployeeDocument> Documents { get; set; }
    }
}
