using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using System.Text.RegularExpressions;

namespace SportConnect.API.Hubs
{
    [Authorize]
    public class MeetingHub : Hub
    {
        private readonly ILogger<MeetingHub> _logger;

        public MeetingHub(ILogger<MeetingHub> logger)
        {
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            _logger.LogInformation("SignalR connected: ConnectionId={ConnectionId}, UserId={UserId}",
                Context.ConnectionId, userId ?? "unknown");
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            _logger.LogInformation("SignalR disconnected: ConnectionId={ConnectionId}, UserId={UserId}, Reason={Reason}",
                Context.ConnectionId, userId ?? "unknown", exception?.Message ?? "normal");
            await base.OnDisconnectedAsync(exception);
        }

        public async Task JoinMeetingGroup(string meetingId)
        {
            if (Guid.TryParse(meetingId, out var parsedId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, parsedId.ToString());
                _logger.LogInformation("User {UserId} joined group {MeetingId}",
                    Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value, parsedId);
            }
        }

        public async Task LeaveMeetingGroup(string meetingId)
        {
            if (Guid.TryParse(meetingId, out var parsedId))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, parsedId.ToString());
                _logger.LogInformation("User {UserId} left group {MeetingId}",
                    Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value, parsedId);
            }
        }
    }
}

