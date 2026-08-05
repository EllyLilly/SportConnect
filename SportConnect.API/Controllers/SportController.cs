using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SportConnect.Infrastructure.Data;
using SportConnect.Infrastructure.Entities;

namespace SportConnect.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SportController : ControllerBase
    {
        private readonly SportConnectDbContext _db;

        public SportController(SportConnectDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult<List<Sport>>> GetAll()
        {
            var sports = await _db.Sports.ToListAsync();
            return Ok(sports);
        }
    }
}
