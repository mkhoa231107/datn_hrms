using System;

namespace HRMS.Domain.Entities
{
    public class EmployeeInsurance
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public Employee Employee { get; set; }

        public bool IsSocialEnabled { get; set; } = true;    // BHXH
        public bool IsHealthEnabled { get; set; } = true;    // BHYT
        public bool IsUnemploymentEnabled { get; set; } = true; // BHTN

        // Voluntary Insurance
        public bool IsHealthcareEnabled { get; set; } = false;   // Bảo hiểm sức khỏe (PVI/Bảo Việt)
        public decimal HealthcareAmount { get; set; } = 0;

        public bool IsLifeInsuranceEnabled { get; set; } = false; // Bảo hiểm nhân thọ
        public decimal LifeInsuranceAmount { get; set; } = 0;

        public decimal AdditionalInsuranceAmount { get; set; } = 0; // BH tự nguyện khác
        public string? Note { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
