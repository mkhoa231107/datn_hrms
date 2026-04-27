using AutoMapper;
using HRMS.Application.DTOs.Employees;
using HRMS.Application.Interfaces;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HRMS.Infrastructure.Services
{
    public class PositionService : IPositionService
    {
        private readonly HRMSDbContext _context;
        private readonly IMapper _mapper;

        public PositionService(HRMSDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<IEnumerable<PositionDto>> GetAllPositionsAsync()
        {
            var positions = await _context.Positions.ToListAsync();
            return _mapper.Map<IEnumerable<PositionDto>>(positions);
        }

        public async Task UpdateCoefficientAsync(int id, decimal coefficient)
        {
            var pos = await _context.Positions.FindAsync(id);
            if (pos != null)
            {
                pos.DefaultCoefficient = coefficient;
                await _context.SaveChangesAsync();
            }
        }

        public async Task UpdateAllowancesAsync(int id, decimal meal, decimal phone, decimal petrol, decimal housing)
        {
            var pos = await _context.Positions.FindAsync(id);
            if (pos != null)
            {
                pos.DefaultMealAllowance = meal;
                pos.DefaultPhoneAllowance = phone;
                pos.DefaultPetrolAllowance = petrol;
                pos.DefaultHousingAllowance = housing;
                await _context.SaveChangesAsync();
            }
        }
    }
}
