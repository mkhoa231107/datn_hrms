using HRMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace HRMS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PositionsController : ControllerBase
    {
        private readonly IPositionService _positionService;

        public PositionsController(IPositionService positionService)
        {
            _positionService = positionService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var positions = await _positionService.GetAllPositionsAsync();
            return Ok(positions);
        }

        [HttpPut("{id}/coefficient")]
        [Authorize(Roles = "Admin,Accountant,CnbSpecialist")]
        public async Task<IActionResult> UpdateCoefficient(int id, [FromBody] CoefficientUpdateRequest request)
        {
            await _positionService.UpdateCoefficientAsync(id, request.Coefficient);
            return Ok(new { success = true });
        }

        [HttpPut("{id}/allowances")]
        [Authorize(Roles = "Admin,Accountant,CnbSpecialist")]
        public async Task<IActionResult> UpdateAllowances(int id, [FromBody] AllowanceUpdateRequest request)
        {
            await _positionService.UpdateAllowancesAsync(id, request.Meal, request.Phone, request.Petrol, request.Housing);
            return Ok(new { success = true });
        }
    }

    public class CoefficientUpdateRequest
    {
        public decimal Coefficient { get; set; }
    }

    public class AllowanceUpdateRequest
    {
        public decimal Meal { get; set; }
        public decimal Phone { get; set; }
        public decimal Petrol { get; set; }
        public decimal Housing { get; set; }
    }
}
