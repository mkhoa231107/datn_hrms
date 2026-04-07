using AutoMapper;
using HRMS.Application.DTOs.Scheduling;
using HRMS.Application.Interfaces;
using HRMS.Domain.Entities;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace HRMS.Infrastructure.Services
{
    public class WorkShiftService : IWorkShiftService
    {
        private readonly HRMSDbContext _context;
        private readonly IMapper _mapper;

        public WorkShiftService(HRMSDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<IEnumerable<WorkShiftDto>> GetAllAsync(int organizationId)
        {
            var shifts = await _context.WorkShifts
                .Where(s => s.OrganizationId == organizationId)
                .OrderBy(s => s.StartTime)
                .ToListAsync();
                
            return _mapper.Map<IEnumerable<WorkShiftDto>>(shifts);
        }

        public async Task<WorkShiftDto> GetByIdAsync(int id)
        {
            var shift = await _context.WorkShifts.FindAsync(id);
            if (shift == null) throw new KeyNotFoundException("Không tìm thấy ca làm việc");
            return _mapper.Map<WorkShiftDto>(shift);
        }

        public async Task<int> CreateAsync(WorkShiftCreateDto dto)
        {
            var shift = _mapper.Map<WorkShift>(dto);
            _context.WorkShifts.Add(shift);
            await _context.SaveChangesAsync();
            return shift.Id;
        }

        public async Task UpdateAsync(int id, WorkShiftCreateDto dto)
        {
            var shift = await _context.WorkShifts.FindAsync(id);
            if (shift == null) throw new KeyNotFoundException("Không tìm thấy ca làm việc");
            
            _mapper.Map(dto, shift);
            shift.UpdatedAt = System.DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var shift = await _context.WorkShifts.FindAsync(id);
            if (shift == null) return;
            
            // Check usage
            if (await _context.WorkSchedules.AnyAsync(s => s.WorkShiftId == id))
                throw new System.InvalidOperationException("Không thể xóa ca làm việc đang được sử dụng trong lịch");
                
            _context.WorkShifts.Remove(shift);
            await _context.SaveChangesAsync();
        }

        public async Task SetDepartmentDefaultShiftAsync(int deptId, int shiftId)
        {
            var existing = await _context.DepartmentDefaultShifts
                .FirstOrDefaultAsync(d => d.DepartmentId == deptId);
                
            if (existing != null)
            {
                existing.WorkShiftId = shiftId;
            }
            else
            {
                _context.DepartmentDefaultShifts.Add(new DepartmentDefaultShift
                {
                    DepartmentId = deptId,
                    WorkShiftId = shiftId
                });
            }
            
            await _context.SaveChangesAsync();
        }

        public async Task<WorkShiftDto> GetDepartmentDefaultShiftAsync(int deptId)
        {
            var defaultShift = await _context.DepartmentDefaultShifts
                .Include(d => d.WorkShift)
                .FirstOrDefaultAsync(d => d.DepartmentId == deptId);
                
            return defaultShift != null ? _mapper.Map<WorkShiftDto>(defaultShift.WorkShift) : null;
        }
    }
}
