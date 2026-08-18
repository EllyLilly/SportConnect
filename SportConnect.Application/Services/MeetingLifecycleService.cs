using Microsoft.Extensions.Logging;
using SportConnect.Core.Entities;
using SportConnect.Infrastructure.Entities;
using SportConnect.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SportConnect.Application.Services
{
    public class MeetingLifecycleService
    {
        private readonly SportConnectDbContext _context;
        private readonly ILogger<MeetingLifecycleService> _logger;

        public MeetingLifecycleService(
            SportConnectDbContext context,
            ILogger<MeetingLifecycleService> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Перевод встречи со ScheduledAt <= Now из Recruiting/Full в Started,
        /// если набран минимум участников. Если минимум не набран - отмена.
        /// </summary>
        public async Task ProcessScheduledMeetingsAsync(CancellationToken cancellationToken)
        {
            var now = DateTime.UtcNow;

            var meetings = await _context.Meetings
                .Where(m => !m.IsDeleted && !m.IsArchived)
                .Where(m => m.Status == MeetingStatus.Recruiting || m.Status == MeetingStatus.Full)
                .Where(m => m.ScheduledAt <= now)
                .ToListAsync(cancellationToken);

            foreach (var meeting in meetings)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var participantsCount = await _context.MeetingParticipants
                    .Where(p => p.MeetingId == meeting.Id && !p.IsDeleted)
                    .CountAsync(cancellationToken);

                if (participantsCount >= meeting.MinParticipants)
                {
                    meeting.Status = MeetingStatus.Started;
                    meeting.UpdatedAt = now;
                    _logger.LogInformation(
                        "Meeting {MeetingId} auto-started (participants: {Count}/{Min})",
                        meeting.Id, participantsCount, meeting.MinParticipants);
                }
                else
                {
                    meeting.Status = MeetingStatus.Cancelled;
                    meeting.IsArchived = true;
                    meeting.ArchivedAt = now;
                    meeting.UpdatedAt = now;
                    _logger.LogInformation(
                        "Meeting {MeetingId} auto-cancelled: minimum participants not met ({Count}/{Min})",
                        meeting.Id, participantsCount, meeting.MinParticipants);
                }
            }

            await _context.SaveChangesAsync(cancellationToken);
        }

        /// <summary>
        /// Завершение встречи со Status = Started, если прошло 3 часа с момента начала.
        /// </summary>
        public async Task ProcessStartedMeetingsAsync(CancellationToken cancellationToken)
        {
            var threshold = DateTime.UtcNow.AddHours(-3);

            var meetings = await _context.Meetings
                .Where(m => !m.IsDeleted && !m.IsArchived)
                .Where(m => m.Status == MeetingStatus.Started)
                .Where(m => m.ScheduledAt <= threshold)
                .ToListAsync(cancellationToken);

            foreach (var meeting in meetings)
            {
                cancellationToken.ThrowIfCancellationRequested();

                meeting.Status = MeetingStatus.Completed;
                meeting.IsArchived = true;
                meeting.ArchivedAt = DateTime.UtcNow;
                meeting.UpdatedAt = DateTime.UtcNow;

                _logger.LogInformation(
                    "Meeting {MeetingId} auto-completed and archived", meeting.Id);
            }

            await _context.SaveChangesAsync(cancellationToken);
        }

        /// <summary>
        /// Удаление старых отмененных встречи, которые висели в архиве больше 7 дней
        /// </summary>
        public async Task PurgeOldCancelledMeetingsAsync(CancellationToken cancellationToken)
        {
            var threshold = DateTime.UtcNow.AddDays(-7);

            var meetings = await _context.Meetings
                .Where(m => !m.IsDeleted)
                .Where(m => m.Status == MeetingStatus.Cancelled)
                .Where(m => m.ArchivedAt != null && m.ArchivedAt <= threshold)
                .ToListAsync(cancellationToken);

            foreach (var meeting in meetings)
            {
                cancellationToken.ThrowIfCancellationRequested();

                meeting.IsDeleted = true;
                meeting.DeletedAt = DateTime.UtcNow;
                meeting.UpdatedAt = DateTime.UtcNow;

                _logger.LogInformation(
                    "Meeting {MeetingId} purged (old cancelled archive)", meeting.Id);
            }

            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
