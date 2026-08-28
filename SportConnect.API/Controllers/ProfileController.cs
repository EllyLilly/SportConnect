using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportConnect.Application.Services;
using SportConnect.Core.DTOs.Meetings;
using SportConnect.Core.DTOs.Profile;

namespace SportConnect.API.Controllers
{
    [ApiController]
    [Route("api/profile")]
    [Authorize]
    public class ProfileController : ControllerBase
    {
        private readonly ProfileService _profileService;
        private readonly CurrentUserService _currentUserService;
        private readonly MeetingService _meetingService;

        public ProfileController(
            ProfileService profileService, 
            CurrentUserService currentUserService,
            MeetingService meetingService)
        {
            _profileService = profileService;
            _currentUserService = currentUserService;
            _meetingService = meetingService;
        }

        [HttpGet]
        public async Task<ActionResult<ProfileDto>> GetProfile()
        {
            if (_currentUserService.UserId == null)
                return Unauthorized();

            var profile = await _profileService.GetProfileAsync(_currentUserService.UserId.Value);
            return Ok(profile);
        }

        [HttpPut]
        public async Task<ActionResult<ProfileDto>> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            if (_currentUserService.UserId == null)
                return Unauthorized();

            var profile = await _profileService.UpdateProfileAsync(_currentUserService.UserId.Value, dto);
            return Ok(profile);
        }

        [HttpGet("meetings")]
        public async Task<ActionResult<List<MeetingHistoryItemDto>>> GetMyMeetings([FromQuery] string filter = "active")
        {
            if (_currentUserService.UserId == null)
                return Unauthorized();

            var meetings = await _meetingService.GetUserMeetingsAsync(_currentUserService.UserId.Value, filter);
            return Ok(meetings);
        }
    }
}
