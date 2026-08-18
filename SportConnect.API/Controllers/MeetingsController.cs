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

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<MeetingDto>> GetById(Guid id)
        {
            var meeting = await _meetingService.GetByIdAsync(id, _currentUserService.UserId);
            return Ok(meeting);
        }

        [HttpPut("{id:guid}")]
        [Authorize]
        public async Task<ActionResult<MeetingDto>> Update(Guid id, [FromBody] UpdateMeetingDto dto)
        {
            if (_currentUserService.UserId == null)
                return Unauthorized();

            var meeting = await _meetingService.UpdateAsync(id, _currentUserService.UserId.Value, dto);
            return Ok(meeting);
        }

        [HttpPost("{id:guid}/cancel")]
        [Authorize]
        public async Task<ActionResult> Cancel(Guid id)
        {
            if (_currentUserService.UserId == null)
                return Unauthorized();

            await _meetingService.CancelAsync(id, _currentUserService.UserId.Value);
            return NoContent();
        }

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
