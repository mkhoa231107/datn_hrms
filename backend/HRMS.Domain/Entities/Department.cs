using System;
using System.Collections.Generic;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Department entity - Phòng ban/Đơn vị
    /// Supports multi-level hierarchy through ParentDepartmentId (self-referencing)
    /// </summary>
    public class Department
    {
        public int Id { get; set; }
        
        public string DepartmentName { get; set; }  // Tên phòng ban
        public string DepartmentCode { get; set; }  // Mã phòng ban
        public string Description { get; set; }
        
        // Organization relationship
        public int OrganizationId { get; set; }
        public Organization Organization { get; set; }
        
        // Self-referencing for multi-level departments (Phòng ban cấp cha)
        public int? ParentDepartmentId { get; set; }
        public Department ParentDepartment { get; set; }
        public ICollection<Department> SubDepartments { get; set; }
        
        // Manager of this department
        public int? ManagerId { get; set; }
        public Employee Manager { get; set; }
        
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation properties
        public ICollection<Employee> Employees { get; set; }
        public ICollection<Position> Positions { get; set; }
    }
}
