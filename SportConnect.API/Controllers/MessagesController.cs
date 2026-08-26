using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportConnect.Application.Services;

namespace SportConnect.API.Controllers
{
    [ApiController]
    [Route("api/meetings/{meetingId}/messages")]
    public class MessagesController : ControllerBase
    {
        private readonly MessageService _messageService;
        private readonly CurrentUserService _currentUserService;

        public MessagesController(MessageService messageService, CurrentUserService currentUserService)
        {
            _messageService = messageService;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetHistory(Guid meetingId)
        {
            var userId = _currentUserService.UserId;

            // Проверяем, что пользователь участник встречи
            var messages = await _messageService.GetHistoryAsync(meetingId);

            return Ok(messages);
        }
    }
}
