namespace HRMS.Application.DTOs.Employees
{
    public class EmergencyContactDto
    {
        public string ContactName { get; set; } = string.Empty;
        public string Relationship { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public bool IsPrimary { get; set; }
    }
}

