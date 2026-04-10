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
    }
}
