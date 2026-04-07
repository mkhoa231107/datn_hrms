using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Payroll Record - Phiếu lương chi tiết của nhân viên (Snapshot)
    /// </summary>
    public class PayrollRecord
    {
        public int Id { get; set; }
        
        public int PayrollPeriodId { get; set; }
        public PayrollPeriod PayrollPeriod { get; set; }
        
        public int EmployeeId { get; set; }
        public Employee Employee { get; set; }
        
         // Income components
        public decimal BasicSalary { get; set; }    // Lương trong hợp đồng
        public decimal ActualWorkingSalary { get; set; } // Lương tính theo công thực tế
        public decimal OvertimePay { get; set; }
        
        // Manual Input Components (Detailed Allowances)
        public decimal PositionAllowance { get; set; }   // PC Vị trí
        public decimal PetrolAllowance { get; set; }     // PC Xăng xe
        public decimal PhoneAllowance { get; set; }      // PC Điện thoại
        public decimal SalesSalary { get; set; }         // Lương doanh số
        public decimal OtherAllowance { get; set; }      // Phụ cấp khác
        
        [NotMapped]
        public decimal TotalAllowances => PositionAllowance + PetrolAllowance + PhoneAllowance + OtherAllowance;
        public decimal Bonus { get; set; }               // Thưởng phát sinh
        
        [NotMapped]
        public decimal GrossSalary => ActualWorkingSalary + OvertimePay + TotalAllowances + Bonus + SalesSalary;
        
        // Deductions
        public decimal SocialInsurance { get; set; }
        public decimal HealthInsurance { get; set; }
        public decimal UnemploymentInsurance { get; set; }
        
        public decimal PersonalIncomeTax { get; set; }
        public decimal OtherDeductions { get; set; } // Phạt/Khác
        
        [NotMapped]
        public decimal TotalDeductions => SocialInsurance + HealthInsurance + UnemploymentInsurance + PersonalIncomeTax + OtherDeductions;
        
        public decimal NetSalary { get; set; }      // Gross - TotalDeductions
        
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
