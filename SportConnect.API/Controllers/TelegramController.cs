using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportConnect.Application.Services;

namespace SportConnect.API.Controllers
{
    [ApiController]
    [Route("api/profile/telegram")]
    [Authorize]
    public class TelegramController : ControllerBase
    {
        private readonly TelegramService _telegramService;

        public TelegramController(TelegramService telegramService)
        {
            _telegramService = telegramService;
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetStatus()
        {
            var status = await _telegramService.GetStatusAsync();
            return Ok(status);
        }

        [HttpPost("generate-code")]
        public async Task<IActionResult> GenerateCode()
        {
            var dto = await _telegramService.GenerateCodeAsync();
            return Ok(dto);
        }

        [HttpDelete]
        public async Task<IActionResult> Disconnect()
        {
            await _telegramService.DisconnectAsync();
            return NoContent();
        }
    }
}
