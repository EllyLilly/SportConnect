using SportConnect.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SportConnect.Application.Abstractions
{
    public interface IMeetingRealtimeNotifier
    {
        Task ParticipantJoinedAsync(Guid meetingId, Guid userId, string userName, int currentCount, CancellationToken ct = default);
        Task ParticipantLeftAsync(Guid meetingId, Guid userId, int currentCount, CancellationToken ct = default);
        Task StatusChangedAsync(Guid meetingId, MeetingStatus newStatus, CancellationToken ct = default);
        Task MeetingCancelledAsync(Guid meetingId, CancellationToken ct = default);
    }
}
