using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SportConnect.Application.Services;
using SportConnect.Core.DTOs.Meetings;

namespace SportConnect.API.Controllers
{
    [ApiController]
    [Route("api/meetings")]
    public class MeetingsController : ControllerBase
    {
        private readonly MeetingService _meetingService;
        private readonly CurrentUserService _currentUserService;

        public MeetingsController(MeetingService meetingService, CurrentUserService currentUserService)
        {
            _meetingService = meetingService;
            _currentUserService = currentUserService;
        }

        /// <summary>
        /// Создать новую встречу
        /// </summary>
        /// <response code="201">Встреча создана</response>
        /// <response code="400">Ошибка валидации</response>
        /// <response code="401">Пользователь не авторизован</response>
        /// <response code="409">Превышен лимит активных встреч</response>
        /// <response code="429">Превышен лимит запросов</response>
        [HttpPost]
        [Authorize]
        [EnableRateLimiting("CreateMeeting")]
        public async Task<ActionResult<MeetingDto>> Create([FromBody] CreateMeetingDto dto)
        {
            if (_currentUserService.UserId == null)
                return Unauthorized();

            var meeting = await _meetingService.CreateAsync(_currentUserService.UserId.Value, dto);
            return CreatedAtAction(nameof(GetById), new { id = meeting.Id }, meeting);
        }

        /// <summary>
        /// Получить встречу по ID
        /// </summary>
        /// <response code="200">Встреча найдена</response>
        /// <response code="404">Встреча не найдена</response>
        [HttpGet("{id:guid}")]
        public async Task<ActionResult<MeetingDto>> GetById(Guid id)
        {
            var meeting = await _meetingService.GetByIdAsync(id, _currentUserService.UserId);
            return Ok(meeting);
        }

        /// <summary>
        /// Обновить встречу (только автор)
        /// </summary>
        /// <response code="200">Встреча обновлена</response>
        /// <response code="400">Ошибка валидации</response>
        /// <response code="401">Пользователь не авторизован</response>
        /// <response code="403">Пользователь не автор встречи</response>
        /// <response code="404">Встреча не найдена</response>
        [HttpPut("{id:guid}")]
        [Authorize]
        public async Task<ActionResult<MeetingDto>> Update(Guid id, [FromBody] UpdateMeetingDto dto)
        {
            if (_currentUserService.UserId == null)
                return Unauthorized();

            var meeting = await _meetingService.UpdateAsync(id, _currentUserService.UserId.Value, dto);
            return Ok(meeting);
        }

        /// <summary>
        /// Отменить встручу (только автор)
        /// </summary>
        /// <response code="204">Встреча отменена</response>
        /// <response code="401">Пользователь не авторизован</response>
        /// <response code="403">Пользователь не автор встречи</response>
        /// <response code="404">Встреча не найдена</response>
        [HttpPost("{id:guid}/cancel")]
        [Authorize]
        public async Task<ActionResult> Cancel(Guid id)
        {
            if (_currentUserService.UserId == null)
                return Unauthorized();

            await _meetingService.CancelAsync(id, _currentUserService.UserId.Value);
            return NoContent();
        }

        /// <summary>
        /// Получить встречи рядом
        /// </summary>
        /// <response code="200">Список встреч в заданных границах</response>
        [HttpGet("nearby")]
        public async Task<ActionResult<List<MeetingListItemDto>>> GetNearby(
            [FromQuery] double minLat,
            [FromQuery] double maxLat,
            [FromQuery] double minLng,
            [FromQuery] double maxLng)
        {
            var meetings = await _meetingService.GetNearbyByBoundsAsync(
                minLat, maxLat, minLng, maxLng, _currentUserService.UserId);
            return Ok(meetings);
        }

        /// <summary>
        /// Присоединиться к встрече
        /// </summary>
        /// <response code="200">Успешное присоединение</response>
        /// <response code="401">Пользователь не авторизован</response>
        /// <response code="404">Встреча не найдена</response>
        /// <response code="409">Нет свободных мест или встреча завершена</response>
        /// <response code="429">Превышен лимит запросов</response>
        [HttpPost("{id:guid}/join")]
        [Authorize]
        [EnableRateLimiting("JoinMeeting")]
        public async Task<ActionResult<MeetingDto>> Join(Guid id)
        {
            if (_currentUserService.UserId == null)
                return Unauthorized();

            var meeting = await _meetingService.JoinAsync(id, _currentUserService.UserId.Value);
            return Ok(meeting);
        }

        /// <summary>
        /// Покинуть встречу
        /// </summary>
        /// <response code="204">Успешный выход</response>
        /// <response code="401">Пользователь не авторизован</response>
        /// <response code="404">Встреча не найдена</response>
        [HttpPost("{id:guid}/leave")]
        [Authorize]
        [EnableRateLimiting("JoinMeeting")]
        public async Task<ActionResult> Leave(Guid id)
        {
            if (_currentUserService.UserId == null)
                return Unauthorized();

            await _meetingService.LeaveAsync(id, _currentUserService.UserId.Value);
            return NoContent();
        }
    }
}
