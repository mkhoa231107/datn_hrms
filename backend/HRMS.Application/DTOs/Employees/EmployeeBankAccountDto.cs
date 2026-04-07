namespace HRMS.Application.DTOs.Employees
{
    public class EmployeeBankAccountDto
    {
        public string BankName { get; set; }
        public string BankBranch { get; set; }
        public string AccountNumber { get; set; }
        public string AccountHolderName { get; set; }
        public bool IsPrimary { get; set; }
    }
}
