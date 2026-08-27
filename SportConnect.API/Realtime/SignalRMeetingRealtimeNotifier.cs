using Microsoft.AspNetCore.SignalR;
using SportConnect.API.Hubs;
using SportConnect.Application.Abstractions;
using SportConnect.Core.Entities;

namespace SportConnect.API.Realtime
{
    public class SignalRMeetingRealtimeNotifier : IMeetingRealtimeNotifier
    {
        private readonly IHubContext<MeetingHub> _hubContext;

        public SignalRMeetingRealtimeNotifier(IHubContext<MeetingHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task ParticipantJoinedAsync(Guid meetingId, Guid userId, string userName, int currentCount, CancellationToken ct = default)
        {
            await _hubContext.Clients.Group(meetingId.ToString())
                .SendAsync("ParticipantJoined", new { userId, userName, currentCount }, ct);
        }

        public async Task ParticipantLeftAsync(Guid meetingId, Guid userId, int currentCount, CancellationToken ct = default)
        {
            await _hubContext.Clients.Group(meetingId.ToString())
                .SendAsync("ParticipantLeft", new { userId, currentCount }, ct);
        }

        public async Task StatusChangedAsync(Guid meetingId, MeetingStatus newStatus, CancellationToken ct = default)
        {
            await _hubContext.Clients.Group(meetingId.ToString())
                .SendAsync("StatusChanged", newStatus, ct);
        }

        public async Task MeetingCancelledAsync(Guid meetingId, CancellationToken ct = default)
        {
            await _hubContext.Clients.Group(meetingId.ToString())
                .SendAsync("MeetingCancelled", cancellationToken: ct);
        }
    }
}
