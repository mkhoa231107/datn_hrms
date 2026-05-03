using HRMS.Application.DTOs.Insurance;
using HRMS.Application.Interfaces;
using HRMS.Domain.Entities;
using HRMS.Domain.Enums;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace HRMS.Infrastructure.Services
{
    public class InsuranceService : IInsuranceService
    {
        private readonly HRMSDbContext _context;

        public InsuranceService(HRMSDbContext context)
        {
            _context = context;
        }

        public async Task<List<EmployeeInsuranceDto>> GetDepartmentInsuranceAsync(int departmentId)
        {
            var deptIds = departmentId == 0 
                ? new List<int>() 
                : await GetDepartmentHierarchyIdsAsync(departmentId);

            var query = _context.Employees
                .Include(e => e.Department)
                .AsQueryable();

            if (departmentId > 0)
            {
                query = query.Where(e => deptIds.Contains(e.DepartmentId));
            }

            var employees = await query.ToListAsync();
            var empIds = employees.Select(e => e.Id).ToList();
            
            // Optimization: Only fetch insurance for the employees in the result
            var insuranceList = await _context.EmployeeInsurances
                .Where(i => empIds.Contains(i.EmployeeId))
                .ToListAsync();

            return employees.Select(e => {
                var ins = insuranceList.FirstOrDefault(i => i.EmployeeId == e.Id);
                return new EmployeeInsuranceDto
                {
                    Id = ins?.Id ?? 0,
                    EmployeeId = e.Id,
                    EmployeeName = e.FullName,
                    EmployeeCode = e.EmployeeCode,
                    DepartmentName = e.Department?.DepartmentName,
                    Status = e.Status,
                    IsSocialEnabled = (e.Status == EmployeeStatus.Active) ? true : (ins?.IsSocialEnabled ?? false),
                    IsHealthEnabled = (e.Status == EmployeeStatus.Active) ? true : (ins?.IsHealthEnabled ?? false),
                    IsUnemploymentEnabled = (e.Status == EmployeeStatus.Active) ? true : (ins?.IsUnemploymentEnabled ?? false),
                    IsHealthcareEnabled = ins?.IsHealthcareEnabled ?? false,
                    HealthcareAmount = ins?.HealthcareAmount ?? 0,
                    IsLifeInsuranceEnabled = ins?.IsLifeInsuranceEnabled ?? false,
                    LifeInsuranceAmount = ins?.LifeInsuranceAmount ?? 0,
                    AdditionalInsuranceAmount = ins?.AdditionalInsuranceAmount ?? 0,
                    Note = ins?.Note
                };
            }).ToList();
        }

        private async Task<List<int>> GetDepartmentHierarchyIdsAsync(int departmentId)
        {
            var result = new List<int> { departmentId };
            var childIds = await _context.Departments
                .Where(d => d.ParentDepartmentId == departmentId)
                .Select(d => d.Id)
                .ToListAsync();

            foreach (var childId in childIds)
            {
                result.AddRange(await GetDepartmentHierarchyIdsAsync(childId));
            }

            return result;
        }

        public async Task<EmployeeInsuranceDto?> GetEmployeeInsuranceAsync(int employeeId)
        {
            var emp = await _context.Employees.Include(e => e.Department).FirstOrDefaultAsync(e => e.Id == employeeId);
            if (emp == null) return null;

            var ins = await _context.EmployeeInsurances.FirstOrDefaultAsync(i => i.EmployeeId == employeeId);

            return new EmployeeInsuranceDto
            {
                Id = ins?.Id ?? 0,
                EmployeeId = emp.Id,
                EmployeeName = emp.FullName,
                EmployeeCode = emp.EmployeeCode,
                DepartmentName = emp.Department?.DepartmentName,
                Status = emp.Status,
                IsSocialEnabled = (emp.Status == EmployeeStatus.Active) ? true : (ins?.IsSocialEnabled ?? false),
                IsHealthEnabled = (emp.Status == EmployeeStatus.Active) ? true : (ins?.IsHealthEnabled ?? false),
                IsUnemploymentEnabled = (emp.Status == EmployeeStatus.Active) ? true : (ins?.IsUnemploymentEnabled ?? false),
                IsHealthcareEnabled = ins?.IsHealthcareEnabled ?? false,
                HealthcareAmount = ins?.HealthcareAmount ?? 0,
                IsLifeInsuranceEnabled = ins?.IsLifeInsuranceEnabled ?? false,
                LifeInsuranceAmount = ins?.LifeInsuranceAmount ?? 0,
                AdditionalInsuranceAmount = ins?.AdditionalInsuranceAmount ?? 0,
                Note = ins?.Note
            };
        }

        public async Task<bool> UpdateEmployeeInsuranceAsync(int employeeId, UpdateEmployeeInsuranceDto dto)
        {
            var emp = await _context.Employees.FindAsync(employeeId);
            if (emp == null) return false;

            var ins = await _context.EmployeeInsurances.FirstOrDefaultAsync(i => i.EmployeeId == employeeId);
            
            // Mandatory for official employees
            bool forceMandatory = emp.Status == EmployeeStatus.Active;
            bool social = forceMandatory ? true : dto.IsSocialEnabled;
            bool health = forceMandatory ? true : dto.IsHealthEnabled;
            bool unemployment = forceMandatory ? true : dto.IsUnemploymentEnabled;

            if (ins == null)
            {
                ins = new EmployeeInsurance
                {
                    EmployeeId = employeeId,
                    IsSocialEnabled = social,
                    IsHealthEnabled = health,
                    IsUnemploymentEnabled = unemployment,
                    IsHealthcareEnabled = dto.IsHealthcareEnabled,
                    HealthcareAmount = dto.HealthcareAmount,
                    IsLifeInsuranceEnabled = dto.IsLifeInsuranceEnabled,
                    LifeInsuranceAmount = dto.LifeInsuranceAmount,
                    AdditionalInsuranceAmount = dto.AdditionalInsuranceAmount,
                    Note = dto.Note,
                    CreatedAt = DateTime.UtcNow
                };
                _context.EmployeeInsurances.Add(ins);
            }
            else
            {
                ins.IsSocialEnabled = social;
                ins.IsHealthEnabled = health;
                ins.IsUnemploymentEnabled = unemployment;
                ins.IsHealthcareEnabled = dto.IsHealthcareEnabled;
                ins.HealthcareAmount = dto.HealthcareAmount;
                ins.IsLifeInsuranceEnabled = dto.IsLifeInsuranceEnabled;
                ins.LifeInsuranceAmount = dto.LifeInsuranceAmount;
                ins.AdditionalInsuranceAmount = dto.AdditionalInsuranceAmount;
                ins.Note = dto.Note;
                ins.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RegisterMandatoryInsuranceAsync(int employeeId)
        {
            var ins = await _context.EmployeeInsurances.FirstOrDefaultAsync(i => i.EmployeeId == employeeId);
            if (ins == null)
            {
                ins = new EmployeeInsurance
                {
                    EmployeeId = employeeId,
                    IsSocialEnabled = true,
                    IsHealthEnabled = true,
                    IsUnemploymentEnabled = true,
                    CreatedAt = DateTime.UtcNow
                };
                _context.EmployeeInsurances.Add(ins);
            }
            else
            {
                ins.IsSocialEnabled = true;
                ins.IsHealthEnabled = true;
                ins.IsUnemploymentEnabled = true;
                ins.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
