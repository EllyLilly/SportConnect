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

        /// <summary>
        /// Получить статус подключения к Телеграм
        /// </summary>
        /// <response code="200">Статус подключения</response>
        /// <response code="401">Пользователь не авторизован</response>
        [HttpGet("status")]
        public async Task<IActionResult> GetStatus()
        {
            var status = await _telegramService.GetStatusAsync();
            return Ok(status);
        }

        /// <summary>
        /// Сгенерировать код для подключения к Телеграм
        /// </summary>
        /// <response code="200">Код и время истечения</response>
        /// <response code="401">Пользователь не авторизован</response>
        [HttpPost("generate-code")]
        public async Task<IActionResult> GenerateCode()
        {
            var dto = await _telegramService.GenerateCodeAsync();
            return Ok(dto);
        }

        /// <summary>
        /// Отключить Телеграм-уведомления
        /// </summary>
        /// <response code="204">Уведомления отключены</response>
        /// <response code="401">Пользователь не авторизован</response>
        [HttpDelete]
        public async Task<IActionResult> Disconnect()
        {
            await _telegramService.DisconnectAsync();
            return NoContent();
        }
    }
}
