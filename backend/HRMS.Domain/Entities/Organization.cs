using System;
using System.Collections.Generic;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Organization/Company entity - Tổ chức/Công ty
    /// Supports multi-company structure if needed
    /// </summary>
    public class Organization
    {
        public int Id { get; set; }
        
        public string OrganizationName { get; set; } // Tên công ty
        public string OrganizationCode { get; set; } // Mã công ty
        public string TaxCode { get; set; }          // Mã số thuế
        public string Address { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public string Website { get; set; }
        
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation properties
        public ICollection<Department> Departments { get; set; }
        public ICollection<Employee> Employees { get; set; }
        public ICollection<PayrollSetting> PayrollSettings { get; set; }
    }
}
