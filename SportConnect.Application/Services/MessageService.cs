using Microsoft.Extensions.Logging;
using SportConnect.Application.Exceptions;
using SportConnect.Core.DTOs.Meetings;
using SportConnect.Core.Entities;
using SportConnect.Infrastructure.Data;
using SportConnect.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;
using SportConnect.Core.DTOs.Meetings;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SportConnect.Application.Services
{
    public class MessageService
    {
        private readonly SportConnectDbContext _context;
        private readonly ILogger<MessageService> _logger;

        public MessageService(SportConnectDbContext context, ILogger<MessageService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<MessageDto> CreateAsync(Guid meetingId, Guid userId, string content)
        {
            if (string.IsNullOrWhiteSpace(content))
                throw new ValidationException("Сообщение не может быть пустым");

            if (content.Length > 1000)
                throw new ValidationException("Сообщение слишком длинное (максимум 1000 символов)");

            var oneMinuteAgo = DateTime.UtcNow.AddMinutes(-1);
            var recentCount = await _context.Messages
                .CountAsync(m => m.UserId == userId && m.SentAt >= oneMinuteAgo);

            if (recentCount >= 30)
                throw new ValidationException("Слишком много сообщений. Подождите минуту.");

            var meeting = await _context.Meetings
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(m => m.Id == meetingId);

            if (meeting == null || meeting.IsDeleted)
                throw new NotFoundException("Встреча не найдена");

            if (meeting.Status == MeetingStatus.Completed
                || meeting.Status == MeetingStatus.Cancelled
                || meeting.IsArchived)
                throw new ValidationException("Чат доступен только для чтения");

            var isParticipant = await _context.MeetingParticipants
                .AnyAsync(p => p.MeetingId == meetingId && p.UserId == userId && !p.IsDeleted);

            if (!isParticipant)
                throw new ConflictException("Только участники встречи могут писать в чат");

            var message = new Message
            {
                Id = Guid.NewGuid(),
                MeetingId = meetingId,
                UserId = userId,
                Content = content.Trim(),
                SentAt = DateTime.UtcNow
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            var sender = await _context.Users.FindAsync(userId);

            return new MessageDto
            {
                Id = message.Id,
                MeetingId = message.MeetingId,
                UserId = message.UserId,
                UserName = sender?.UserName ?? "Неизвестный",
                Content = message.Content,
                SentAt = message.SentAt
            };
        }

        public async Task<List<MessageDto>> GetHistoryAsync(Guid meetingId, int take = 50)
        {
            var messages = await _context.Messages
                .AsNoTracking()
                .Where(m => m.MeetingId == meetingId)
                .OrderByDescending(m => m.SentAt)
                .Take(take)
                .Include(m => m.Sender)
                .ToListAsync();

            return messages
                .OrderBy(m => m.SentAt)
                .Select(m => new MessageDto
                {
                    Id = m.Id,
                    MeetingId = m.MeetingId,
                    UserId = m.UserId,
                    UserName = m.Sender?.UserName ?? "Неизвестный",
                    Content = m.Content,
                    SentAt = m.SentAt
                })
                .ToList();
        }
    }
}
