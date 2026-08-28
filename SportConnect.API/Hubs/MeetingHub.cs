using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SportConnect.Application.Services;
using System.Security.Claims;
using SportConnect.Application.Exceptions;
using Microsoft.Extensions.DependencyInjection;
using System.Text.RegularExpressions;

namespace SportConnect.API.Hubs
{
    [Authorize]
    public class MeetingHub : Hub
    {
        private readonly ILogger<MeetingHub> _logger;
        private readonly IServiceScopeFactory _scopeFactory;

        public MeetingHub(ILogger<MeetingHub> logger, IServiceScopeFactory scopeFactory)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
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

        public async Task SendMessage(Guid meetingId, string content)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var parsedUserId))
                throw new HubException("Unauthorized");

            using var scope = _scopeFactory.CreateScope();
            var messageService = scope.ServiceProvider.GetRequiredService<MessageService>();

            try
            {
                var message = await messageService.CreateAsync(meetingId, parsedUserId, content);
                await Clients.Group(meetingId.ToString())
                    .SendAsync("ReceiveMessage", message);
            }
            catch (AppException ex)
            {
                throw new HubException(ex.Message);
            }
        }
    }
}

