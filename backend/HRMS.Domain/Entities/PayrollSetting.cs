using System;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Payroll Setting - Cấu hình các tham số tính lương (BHXH, Thuế TNCN, Giảm trừ)
    /// </summary>
    public class PayrollSetting
    {
        public int Id { get; set; }
        
        // Social Insurance % (Employee part)
        public decimal SocialInsuranceRate { get; set; } = 8.0m;
        public decimal HealthInsuranceRate { get; set; } = 1.5m;
        public decimal UnemploymentInsuranceRate { get; set; } = 1.0m;
        
        // Pit (Personal Income Tax) Deductions
        public decimal PersonalDeductionAmount { get; set; } = 11000000m; // 11tr
        public decimal DependentDeductionAmount { get; set; } = 4400000m;  // 4.4tr
        
        // Base Salaries for Insurance Caps
        public decimal CommonBaseSalary { get; set; } = 1800000m; // Lương cơ sở
        public decimal RegionBaseSalary { get; set; } = 4680000m; // Lương tối thiểu vùng (Vùng 1)
        
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        public int OrganizationId { get; set; }
        public Organization Organization { get; set; }
    }
}
