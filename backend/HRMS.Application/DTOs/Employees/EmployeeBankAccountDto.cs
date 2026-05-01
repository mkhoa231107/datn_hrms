namespace HRMS.Application.DTOs.Employees
{
    public class EmployeeBankAccountDto
    {
        public string BankName { get; set; } = string.Empty;
        public string BankBranch { get; set; } = string.Empty;
        public string AccountNumber { get; set; } = string.Empty;
        public string AccountHolderName { get; set; } = string.Empty;
        public bool IsPrimary { get; set; }
    }
}

