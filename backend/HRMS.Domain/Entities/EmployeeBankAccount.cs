using System;

namespace HRMS.Domain.Entities
{
    /// <summary>
    /// Employee Bank Account - Tài khoản ngân hàng nhân viên
    /// </summary>
    public class EmployeeBankAccount
    {
        public int Id { get; set; }
        
        public int EmployeeId { get; set; }
        public Employee Employee { get; set; }
        
        public string BankName { get; set; }        // Tên ngân hàng
        public string BankBranch { get; set; }      // Chi nhánh
        public string AccountNumber { get; set; }   // Số tài khoản
        public string AccountHolderName { get; set; } // Tên chủ tài khoản
        
        public bool IsPrimary { get; set; } = false; // Tài khoản chính (nhận lương)
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
