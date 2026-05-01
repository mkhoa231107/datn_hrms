using System;
using System.Collections.Generic;

namespace HRMS.Application.DTOs.Payroll
{
    public class PayrollSettingDto
    {
        public decimal SocialInsuranceRate { get; set; }
        public decimal HealthInsuranceRate { get; set; }
        public decimal UnemploymentInsuranceRate { get; set; }
        public decimal PersonalDeductionAmount { get; set; }
        public decimal DependentDeductionAmount { get; set; }
        public decimal CommonBaseSalary { get; set; }
        public decimal RegionBaseSalary { get; set; }
    }

    public class EmployeePayrollProfileDto
    {
        public int EmployeeId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;
        public int DepartmentId { get; set; }
        public string DepartmentName { get; set; } = string.Empty;
        public string PositionName { get; set; } = string.Empty;
        public string WorkingStatus { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public decimal BasicSalary { get; set; }
        public decimal Coefficient { get; set; }
        public decimal? MealAllowance { get; set; }
        public decimal? PhoneAllowance { get; set; }
        public decimal? PetrolAllowance { get; set; }
        public decimal? HousingAllowance { get; set; }
        public decimal? InsuranceSalary { get; set; }
        public int NumberOfDependents { get; set; }
        // Attendance summary data for display before calculation
        public decimal ActualWorkingDays { get; set; }
        public decimal OvertimeHours { get; set; }
        public decimal PaidLeaveDays { get; set; }
        public decimal UnpaidLeaveDays { get; set; }
        public bool HasApprovedTimesheet { get; set; }
    }

    public class EmployeePayrollUpdateDto
    {
        public decimal? InsuranceSalary { get; set; }
        public int NumberOfDependents { get; set; }
        public decimal Coefficient { get; set; }
    }

    public class PayrollPeriodDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int SchedulePeriodId { get; set; }
        public string SchedulePeriodName { get; set; } = string.Empty;
        public string? ProcessedByName { get; set; }
        public string? ReviewedByName { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public string? ApprovedByName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreatePayrollPeriodDto
    {
        public string Name { get; set; } = string.Empty;
        public int SchedulePeriodId { get; set; }
    }

    public class AdjustPayrollRecordDto
    {
        public decimal PositionAllowance { get; set; }
        public decimal PetrolAllowance { get; set; }
        public decimal PhoneAllowance { get; set; }
        public decimal OtherAllowance { get; set; }
        public decimal SalesSalary { get; set; }
        public decimal Bonus { get; set; }
        public decimal OtherDeductions { get; set; }
        public string? Note { get; set; }
    }

    public class BulkAdjustPayrollDto
    {
        public int RecordId { get; set; }
        public decimal PositionAllowance { get; set; }
        public decimal PetrolAllowance { get; set; }
        public decimal PhoneAllowance { get; set; }
        public decimal OtherAllowance { get; set; }
        public decimal SalesSalary { get; set; }
        public decimal Bonus { get; set; }
    }

    public class BulkUpdatePayrollRequest
    {
        public List<BulkAdjustPayrollDto> Adjustments { get; set; } = new();
    }

    public class CalculateForEmployeesDto
    {
        public List<int> EmployeeIds { get; set; } = new();
    }

    public class PayrollRecordDto
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string EmployeeCode { get; set; } = string.Empty;
        public string EmployeeName { get; set; } = string.Empty;
        public string DepartmentName { get; set; } = string.Empty;
        public string PositionName { get; set; } = string.Empty;
        public decimal Coefficient { get; set; }
        public decimal ActualWorkingDays { get; set; }
        public decimal BasicSalary { get; set; }
         public decimal ActualWorkingSalary { get; set; }
        public decimal OvertimePay { get; set; }
        
        // Manual Components
        public decimal PositionAllowance { get; set; }
        public decimal PetrolAllowance { get; set; }
        public decimal PhoneAllowance { get; set; }
        public decimal HousingAllowance { get; set; }
        public decimal MealAllowance { get; set; }
        public decimal OtherAllowance { get; set; }
        public decimal SalesSalary { get; set; }
        
        public decimal TotalAllowances { get; set; }
        public decimal Bonus { get; set; }
        public decimal GrossSalary { get; set; }
        public decimal SocialInsurance { get; set; }
        public decimal HealthInsurance { get; set; }
        public decimal UnemploymentInsurance { get; set; }
        public decimal PersonalIncomeTax { get; set; }
        public decimal MealDeduction { get; set; }
        public decimal OtherDeductions { get; set; }
        public decimal TotalDeductions { get; set; }
        public decimal NetSalary { get; set; }
        public string? Note { get; set; }
    }
}

