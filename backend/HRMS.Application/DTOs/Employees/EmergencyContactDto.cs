namespace HRMS.Application.DTOs.Employees
{
    public class EmergencyContactDto
    {
        public string ContactName { get; set; }
        public string Relationship { get; set; }
        public string Phone { get; set; }
        public string Address { get; set; }
        public bool IsPrimary { get; set; }
    }
}
