namespace HRMS.Application.DTOs.Employees
{
    public class EmployeeUpdateDto
    {
        public string? FullName { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? PlaceOfOrigin { get; set; }
        public string? Nationality { get; set; }
        public string? Ethnicity { get; set; }
        public string? Religion { get; set; }
        public string? IdentityNumber { get; set; }
        public DateTime? IdentityDate { get; set; }
        public string? IdentityPlace { get; set; }
        public DateTime? IdentityExpirationDate { get; set; }
        public string? PersonalEmail { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? CurrentAddress { get; set; }
        public string? Avatar { get; set; }
        public bool? IsActive { get; set; }
    }
}
