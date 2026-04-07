using AutoMapper;
using HRMS.Application.DTOs.Departments;
using HRMS.Application.Interfaces;
using HRMS.Domain.Entities;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HRMS.Infrastructure.Services
{
    public class DepartmentService : IDepartmentService
    {
        private readonly HRMSDbContext _context;
        private readonly IMapper _mapper;

        public DepartmentService(HRMSDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<IEnumerable<DepartmentDto>> GetAllDepartmentsAsync()
        {
            var departments = await _context.Departments
                .Include(d => d.Manager)
                .Include(d => d.ParentDepartment)
                .ToListAsync();
            return _mapper.Map<IEnumerable<DepartmentDto>>(departments);
        }

        public async Task<DepartmentDto> GetDepartmentByIdAsync(int id)
        {
            var dept = await _context.Departments
                .Include(d => d.Manager)
                .Include(d => d.ParentDepartment)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (dept == null) throw new KeyNotFoundException("Không tìm thấy phòng ban.");

            return _mapper.Map<DepartmentDto>(dept);
        }

        public async Task<DepartmentDto> CreateDepartmentAsync(DepartmentCreateDto dto)
        {
            var dept = _mapper.Map<Department>(dto);
            dept.CreatedAt = DateTime.UtcNow;

            _context.Departments.Add(dept);
            await _context.SaveChangesAsync();

            // Re-fetch to include related data if needed, or just map back
            return await GetDepartmentByIdAsync(dept.Id);
        }

        public async Task<DepartmentDto> UpdateDepartmentAsync(int id, DepartmentUpdateDto dto)
        {
            var dept = await _context.Departments.FindAsync(id);
            if (dept == null) throw new KeyNotFoundException("Không tìm thấy phòng ban.");

            _mapper.Map(dto, dept);
            dept.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return await GetDepartmentByIdAsync(id);
        }

        public async Task DeleteDepartmentAsync(int id)
        {
            var dept = await _context.Departments.FindAsync(id);
            if (dept == null) throw new KeyNotFoundException("Không tìm thấy phòng ban.");

            // Check constraint?? Maybe just delete for now.
             _context.Departments.Remove(dept);
            await _context.SaveChangesAsync();
        }
    }
}
