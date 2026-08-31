using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using SportConnect.Infrastructure.Data;
using SportConnect.Infrastructure.Entities;
using System.Text.Json;

namespace SportConnect.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SportController : ControllerBase
    {
        private readonly SportConnectDbContext _db;
        private readonly IDistributedCache _cache;

        public SportController(SportConnectDbContext db, IDistributedCache cache)
        {
            _db = db;
            _cache = cache;
        }

        /// <summary>
        /// Получить список всех видов спорта
        /// </summary>
        /// <response code="200">Список видов спорта</response>
        [HttpGet]
        public async Task<ActionResult<List<Sport>>> GetAll()
        {
            var cacheKey = "sports";
            var cached = await _cache.GetStringAsync(cacheKey);

            if (cached != null)
            {
                var cachedSports = JsonSerializer.Deserialize<List<Sport>>(cached);
                return Ok(cachedSports);
            }

            var sports = await _db.Sports.ToListAsync();

            var serialized = JsonSerializer.Serialize(sports);
            await _cache.SetStringAsync(cacheKey, serialized, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
            });

            return Ok(sports);
        }
    }
}
