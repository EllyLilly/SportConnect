using SportConnect.Application.Abstractions;
using SportConnect.Infrastructure.Data;
using SportConnect.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SportConnect.Application.Services
{
    public class NotificationService
    {
        private readonly SportConnectDbContext _db;
        private readonly INotificationQueue _queue;

        public NotificationService(SportConnectDbContext db, INotificationQueue queue)
        {
            _db = db;
            _queue = queue;
        }

        public async Task QueueNotificationsForMeetingAsync(Guid meetingId, CancellationToken ct = default)
        {
            var meeting = await _db.Meetings
                .AsNoTracking()
                .Include(m => m.Sport)
                .FirstOrDefaultAsync(m => m.Id == meetingId, ct);

            if (meeting == null)
                return;

            // Поиск подходящих получателей подключены к тг, не автор, интересуются этим спортом
            var recipients = await _db.TelegramConnections
                .Where(tc => tc.IsActive)
                .Where(tc => tc.UserId != meeting.AuthorId)
                .Join(_db.Users, tc => tc.UserId, u => u.Id, (tc, u) => new { tc, u })
                .Where(x => _db.UserSportPreferences
                    .Any(usp => usp.UserId == x.u.Id && usp.SportId == meeting.SportId))
                .Select(x => x.u.Id)
                .ToListAsync(ct);

            // лимит не более 10 уведомлений в час
            var oneHourAgo = DateTime.UtcNow.AddHours(-1);

            foreach (var userId in recipients)
            {
                var recentCount = await _db.NotificationLogs
                    .CountAsync(nl => nl.UserId == userId && nl.CreatedAt >= oneHourAgo, ct);

                if (recentCount >= 10)
                    continue;

                // Проверка не было ли уже уведомление об этой встрече
                var alreadyExists = await _db.NotificationLogs
                    .AnyAsync(nl => nl.UserId == userId && nl.MeetingId == meetingId && nl.Type == "Telegram", ct);

                if (alreadyExists)
                    continue;

                var notification = new NotificationLog
                {
                    UserId = userId,
                    MeetingId = meetingId,
                    Type = "Telegram",
                    Status = "Pending",
                    Content = $"Новая встреча рядом!\n\n" +
                              $"Вид спорта: {meeting.Sport.Name}\n" +
                              $"Время: {meeting.ScheduledAt.ToLocalTime():dd.MM HH:mm}\n" +
                              $"Участники: 1/{meeting.MaxParticipants}\n" +
                              $"Открыть встречу: http://localhost:5173/map?meetingId={meetingId}"
                };

                _db.NotificationLogs.Add(notification);
            }

            await _db.SaveChangesAsync(ct);
        }
    }
}
