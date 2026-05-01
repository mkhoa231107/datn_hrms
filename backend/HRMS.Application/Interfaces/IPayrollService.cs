using System.Collections.Generic;
using System.Threading.Tasks;
using HRMS.Application.DTOs.Payroll;

namespace HRMS.Application.Interfaces
{
    public interface IPayrollService
    {
        // Settings
        Task<PayrollSettingDto> GetCurrentSettingsAsync(int organizationId);
        Task UpdateSettingsAsync(int organizationId, PayrollSettingDto dto);
        
        // Employee Payroll Profiles
        Task<IEnumerable<EmployeePayrollProfileDto>> GetEmployeePayrollProfilesAsync(int? departmentId = null);
        Task UpdateEmployeePayrollProfileAsync(int employeeId, EmployeePayrollUpdateDto dto);
        
        // Payroll Periods & Processing
        Task<IEnumerable<PayrollPeriodDto>> GetPayrollPeriodsAsync();
        Task<PayrollPeriodDto> CreatePayrollPeriodAsync(CreatePayrollPeriodDto dto);
        
        // Workflow Steps
        Task CalculatePayrollAsync(int periodId, int userId); // Step 2: Payroll Staff
        Task AdjustPayrollRecordAsync(int recordId, AdjustPayrollRecordDto dto); // Step 3: Payroll Staff
        Task ReviewPayrollAsync(int periodId, int userId); // Step 4: HR-CB Manager
        Task ApprovePayrollAsync(int periodId, int userId); // Step 5: HR Director/Admin
        
        // New Professional Payroll Methods
        Task BulkUpdateRecordsAsync(int periodId, BulkUpdatePayrollRequest request);
        Task AddEmployeesToPayrollAsync(int periodId, List<int> employeeIds);
        Task AggregatePayrollAsync(int periodId);
        
        // Calculate payroll for a specific list of employees (new main workflow)
        Task CalculatePayrollForEmployeesAsync(int periodId, List<int> employeeIds, int userId);
        
        // Get employee profiles enriched with attendance data for pre-calculation display
        Task<IEnumerable<EmployeePayrollProfileDto>> GetEmployeeProfilesWithAttendanceAsync(int departmentId, int schedulePeriodId);
        
        // Reporting
        Task<IEnumerable<PayrollRecordDto>> GetPayrollRecordsAsync(int periodId);
        Task<PayrollRecordDto> GetMyPayslipAsync(int employeeId, int periodId);
    }
}
