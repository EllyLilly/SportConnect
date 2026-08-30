using SportConnect.Application.Exceptions;
using SportConnect.Core.DTOs.Meetings;
using SportConnect.Infrastructure.Data;
using SportConnect.Infrastructure.Entities;
using SportConnect.Core.Entities;
using NetTopologySuite.Geometries;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using SportConnect.Application.Abstractions;

namespace SportConnect.Application.Services
{
    public class MeetingService
    {
        private readonly SportConnectDbContext _context;
        private readonly ILogger<MeetingService> _logger;
        private readonly IMeetingRealtimeNotifier _notifier;
        private readonly NotificationService _notificationService;

        public MeetingService(SportConnectDbContext context, ILogger<MeetingService> logger, IMeetingRealtimeNotifier notifier, NotificationService notificationService)
        {
            _context = context;
            _logger = logger;
            _notifier = notifier;
            _notificationService = notificationService;
        }

        public async Task<MeetingDto> CreateAsync(Guid authorId, CreateMeetingDto dto)
        {
            var activeMeetingsCount = await _context.Meetings
                .CountAsync(m => m.AuthorId == authorId
                    && !m.IsArchived
                    && m.Status != MeetingStatus.Completed
                    && m.Status != MeetingStatus.Cancelled);

            if (activeMeetingsCount >= 3)
                throw new ConflictException("У вас уже есть 3 активные встречи. Завершите или отмените одну из них.");

            var meeting = new Meeting
            {
                Id = Guid.NewGuid(),
                Title = dto.Title,
                Description = dto.Description,
                Address = dto.Address,
                Location = new Point(dto.Longitude, dto.Latitude) { SRID = 4326 },
                ScheduledAt = dto.ScheduledAt.Kind == DateTimeKind.Utc
                    ? dto.ScheduledAt
                    : dto.ScheduledAt.ToUniversalTime(),
                MinParticipants = dto.MinParticipants,
                MaxParticipants = dto.MaxParticipants,
                Status = MeetingStatus.Recruiting,
                RequiredSkillLevel = dto.RequiredSkillLevel,
                Inventory = dto.Inventory,
                SportId = dto.SportId,
                AuthorId = authorId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Meetings.Add(meeting);

            _context.MeetingParticipants.Add(new MeetingParticipant
            {
                MeetingId = meeting.Id,
                UserId = authorId,
                JoinedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            // После сохранения встречи в БД уведомления идет в очередь
            await _notificationService.QueueNotificationsForMeetingAsync(meeting.Id);

            return await GetByIdAsync(meeting.Id, authorId);
        }

        public async Task<MeetingDto> GetByIdAsync(Guid meetingId, Guid? currentUserId = null)
        {
            var meeting = await _context.Meetings
                .Include(m => m.Sport)
                .Include(m => m.Author)
                .Include(m => m.Participants)
                    .ThenInclude(p => p.User)
                .FirstOrDefaultAsync(m => m.Id == meetingId);

            if (meeting == null)
                throw new NotFoundException("Встреча не найдена");

            var dto = MapToDto(meeting);

            if (currentUserId.HasValue)
            {
                var isAuthor = meeting.AuthorId == currentUserId.Value;
                var isParticipant = meeting.Participants.Any(p => p.UserId == currentUserId.Value && !p.IsDeleted);
                var isFull = dto.ParticipantsCount >= meeting.MaxParticipants;
                var canJoin = (meeting.Status == MeetingStatus.Recruiting || meeting.Status == MeetingStatus.Full)
                              && !isParticipant && !isFull;

                dto.CanEdit = isAuthor && meeting.Status != MeetingStatus.Completed && meeting.Status != MeetingStatus.Cancelled;
                dto.CanJoin = canJoin;
                dto.CanLeave = isParticipant && !isAuthor && meeting.Status != MeetingStatus.Completed && meeting.Status != MeetingStatus.Cancelled;
            }

            return dto;
        }

        public async Task<MeetingDto> UpdateAsync(Guid meetingId, Guid userId, UpdateMeetingDto dto)
        {
            var meeting = await _context.Meetings
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(m => m.Id == meetingId);

            if (meeting == null || meeting.IsDeleted)
                throw new NotFoundException("Встреча не найдена");

            if (meeting.AuthorId != userId)
                throw new ConflictException("Только автор может редактировать встречу");

            if (meeting.Status == MeetingStatus.Started
                || meeting.Status == MeetingStatus.Completed
                || meeting.Status == MeetingStatus.Cancelled)
                throw new ConflictException("Нельзя редактировать встречу в текущем статусе");

            var currentParticipants = await _context.MeetingParticipants
                .Where(p => p.MeetingId == meetingId && !p.IsDeleted)
                .CountAsync();

            if (dto.MaxParticipants < currentParticipants)
                throw new ConflictException($"Нельзя сократить участников ниже текущего количества ({currentParticipants})");

            var scheduledAtUtc = dto.ScheduledAt.Kind == DateTimeKind.Utc
                ? dto.ScheduledAt
                : dto.ScheduledAt.ToUniversalTime();

            // Валидация не в прошлом только если время реально меняется
            var timeChanged = Math.Abs((scheduledAtUtc - meeting.ScheduledAt).TotalSeconds) > 1;

            if (timeChanged && scheduledAtUtc < DateTime.UtcNow)
                throw new ConflictException("Нельзя перенести встречу в прошлое");

            meeting.Title = dto.Title;
            meeting.Description = dto.Description;
            meeting.Address = dto.Address;
            meeting.Location = new Point(dto.Longitude, dto.Latitude) { SRID = 4326 };

            // Если время не менялось, сохраняется оригинал
            meeting.ScheduledAt = timeChanged ? scheduledAtUtc : meeting.ScheduledAt;

            meeting.MinParticipants = dto.MinParticipants;
            meeting.MaxParticipants = dto.MaxParticipants;
            meeting.RequiredSkillLevel = dto.RequiredSkillLevel;
            meeting.Inventory = dto.Inventory;
            meeting.SportId = dto.SportId;
            meeting.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetByIdAsync(meetingId, userId);
        }

        public async Task CancelAsync(Guid meetingId, Guid userId)
        {
            var meeting = await _context.Meetings
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(m => m.Id == meetingId);

            if (meeting == null || meeting.IsDeleted)
                throw new NotFoundException("Встреча не найдена");

            if (meeting.AuthorId != userId)
                throw new ConflictException("Только автор может отменить встречу");

            if (meeting.Status == MeetingStatus.Completed
                || meeting.Status == MeetingStatus.Cancelled)
                throw new ConflictException("Нельзя отменить встречу в текущем статусе");

            meeting.Status = MeetingStatus.Cancelled;
            meeting.IsArchived = true;
            meeting.ArchivedAt = DateTime.UtcNow;
            meeting.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _notifier.MeetingCancelledAsync(meetingId);

            _logger.LogInformation("Meeting {MeetingId} cancelled by author {UserId}", meetingId, userId);
        }

        private static MeetingDto MapToDto(Meeting m)
        {
            var now = DateTime.UtcNow;
            var participants = m.Participants.Where(p => !p.IsDeleted).ToList();

            return new MeetingDto
            {
                Id = m.Id,
                Title = m.Title,
                Description = m.Description,
                Address = m.Address,
                Latitude = m.Location.Y,
                Longitude = m.Location.X,
                ScheduledAt = m.ScheduledAt,
                MinParticipants = m.MinParticipants,
                MaxParticipants = m.MaxParticipants,
                Status = m.Status,
                RequiredSkillLevel = m.RequiredSkillLevel,
                Inventory = m.Inventory,
                SportId = m.SportId,
                SportName = m.Sport.Name,
                SportColor = m.Sport.Color ?? "#000000",
                AuthorId = m.AuthorId,
                AuthorName = m.Author.UserName ?? "Неизвестный",
                AuthorSkillLevel = m.Author.SkillLevel,
                ParticipantsCount = m.Participants.Count,
                Participants = participants.Select(p => new MeetingParticipantDto
                {
                    UserId = p.UserId,
                    UserName = p.User?.UserName ?? "Неизвестный",
                    JoinedAt = p.JoinedAt
                }).ToList(),
                CreatedAt = m.CreatedAt,
                TimeUntilStartMinutes = (int)(m.ScheduledAt - now).TotalMinutes
            };
        }

        public async Task<List<MeetingListItemDto>> GetNearbyAsync(double lat, double lng, int radiusMeters, List<Guid>? sportIds = null)
        {
            var point = new Point(lng, lat) { SRID = 4326 };

            var query = _context.Meetings
                .Where(m => !m.IsDeleted && !m.IsArchived)
                .Where(m => m.Status == MeetingStatus.Recruiting || m.Status == MeetingStatus.Full)
                .Where(m => m.Location.IsWithinDistance(point, radiusMeters))
                .Include(m => m.Participants)
                .Include(m => m.Sport)
                .AsQueryable();

            if (sportIds != null && sportIds.Count > 0)
                query = query.Where(m => sportIds.Contains(m.SportId));

            var meetings = await query
                .OrderBy(m => m.ScheduledAt)
                .Take(100)
                .ToListAsync();

            return meetings.Select(m => new MeetingListItemDto
            {
                Id = m.Id,
                Title = m.Title,
                Latitude = m.Location.Y,
                Longitude = m.Location.X,
                ScheduledAt = m.ScheduledAt,
                Status = m.Status,
                SportName = m.Sport.Name,
                SportColor = m.Sport.Color ?? "#000000",
                ParticipantsCount = m.Participants.Count,
                MaxParticipants = m.MaxParticipants
            }).ToList();
        }

        public async Task<List<MeetingListItemDto>> GetNearbyByBoundsAsync(
            double minLat, double maxLat, double minLng, double maxLng,
            Guid? userId = null)
        {
            var envelope = new Polygon(
                new LinearRing(new[]
                {
            new Coordinate(minLng, minLat),
            new Coordinate(maxLng, minLat),
            new Coordinate(maxLng, maxLat),
            new Coordinate(minLng, maxLat),
            new Coordinate(minLng, minLat),
                })
            )
            { SRID = 4326 };

            var query = _context.Meetings
                .Where(m => !m.IsDeleted && !m.IsArchived)
                .Where(m => m.Status == MeetingStatus.Recruiting || m.Status == MeetingStatus.Full)
                .Where(m => m.Location.Intersects(envelope))
                .Include(m => m.Participants)
                .Include(m => m.Sport)
                .AsQueryable();

            if (userId.HasValue)
            {
                var user = await _context.Users
                    .Include(u => u.SportPreferences)
                    .FirstOrDefaultAsync(u => u.Id == userId.Value);

                if (user != null && user.SportPreferences.Count > 0)
                {
                    var sportIds = user.SportPreferences.Select(sp => sp.SportId).ToList();
                    query = query.Where(m => sportIds.Contains(m.SportId));
                }
            }

            var meetings = await query
                .OrderBy(m => m.ScheduledAt)
                .Take(100)
                .ToListAsync();

            return meetings.Select(m => new MeetingListItemDto
            {
                Id = m.Id,
                Title = m.Title,
                Latitude = m.Location.Y,
                Longitude = m.Location.X,
                ScheduledAt = m.ScheduledAt,
                Status = m.Status,
                SportName = m.Sport.Name,
                SportColor = m.Sport.Color ?? "#000000",
                ParticipantsCount = m.Participants.Count,
                MaxParticipants = m.MaxParticipants
            }).ToList();
        }

        public async Task<List<MeetingListItemDto>> GetNearbyForUserAsync(Guid userId, double lat, double lng)
        {
            var user = await _context.Users
                .Include(u => u.SportPreferences)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                throw new NotFoundException("Пользователь не найден");

            var sportIds = user.SportPreferences
                .Select(sp => sp.SportId)
                .ToList();

            return await GetNearbyAsync(lat, lng, user.RadiusMeters, sportIds.Count > 0 ? sportIds : null);
        }

        public async Task<MeetingDto> JoinAsync(Guid meetingId, Guid userId)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            try
            {
                Meeting? meeting;

                if (_context.Database.IsRelational())
                {
                    meeting = await _context.Meetings
                        .FromSqlInterpolated($"SELECT * FROM \"Meetings\" WHERE \"Id\" = {meetingId} FOR UPDATE")
                        .IgnoreQueryFilters()
                        .FirstOrDefaultAsync();
                }
                else
                {
                    meeting = await _context.Meetings
                        .IgnoreQueryFilters()
                        .FirstOrDefaultAsync(m => m.Id == meetingId);
                }

                if (meeting == null)
                    throw new NotFoundException("Встреча не найдена");

                if (meeting.IsDeleted)
                    throw new NotFoundException("Встреча не найдена");

                if (meeting.Status == MeetingStatus.Cancelled
                    || meeting.Status == MeetingStatus.Completed
                    || meeting.Status == MeetingStatus.Started)
                    throw new ConflictException("Нельзя присоединиться к этой встрече");

                var actualCount = await _context.MeetingParticipants
                    .Where(p => p.MeetingId == meetingId && !p.IsDeleted)
                    .CountAsync();

                if (actualCount >= meeting.MaxParticipants)
                    throw new ConflictException("Мест больше нет");

                var existingParticipant = await _context.MeetingParticipants
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(p => p.MeetingId == meetingId && p.UserId == userId);

                if (existingParticipant != null)
                {
                    if (!existingParticipant.IsDeleted)
                        throw new ConflictException("Вы уже участвуете");

                    existingParticipant.IsDeleted = false;
                    existingParticipant.DeletedAt = null;
                    existingParticipant.JoinedAt = DateTime.UtcNow;
                }
                else
                {
                    _context.MeetingParticipants.Add(new MeetingParticipant
                    {
                        MeetingId = meetingId,
                        UserId = userId,
                        JoinedAt = DateTime.UtcNow
                    });
                }

                if (actualCount + 1 >= meeting.MaxParticipants)
                    meeting.Status = MeetingStatus.Full;

                meeting.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var joinedUser = await _context.Users.FindAsync(userId);
                var currentCount = await _context.MeetingParticipants
                    .CountAsync(p => p.MeetingId == meetingId && !p.IsDeleted);

                await _notifier.ParticipantJoinedAsync(
                    meetingId,
                    userId,
                    joinedUser?.UserName ?? "Участник",
                    currentCount);

                return await GetByIdAsync(meetingId, userId);
            }
            catch (Exception ex)
            {
                try
                {
                    await transaction.RollbackAsync();
                }
                catch
                {
                    //транзакция уже завершена, игнор
                }
                throw;
            }
        }

        public async Task LeaveAsync(Guid meetingId, Guid userId)
        {
            var participant = await _context.MeetingParticipants
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(p => p.MeetingId == meetingId && p.UserId == userId);

            if (participant == null || participant.IsDeleted)
                throw new NotFoundException("Вы не участник этой встречи");

            var meeting = await _context.Meetings
                .FirstOrDefaultAsync(m => m.Id == meetingId);

            if (meeting == null)
                throw new NotFoundException("Встреча не найдена");

            if (meeting.AuthorId == userId)
                throw new ConflictException("Автор не может покинуть свою встречу");

            participant.IsDeleted = true;
            participant.DeletedAt = DateTime.UtcNow;

            //если встреча Full - возврат в Recruiting
            if (meeting.Status == MeetingStatus.Full)
                meeting.Status = MeetingStatus.Recruiting;

            meeting.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var currentCount = await _context.MeetingParticipants
    .CountAsync(p => p.MeetingId == meetingId && !p.IsDeleted);

            await _notifier.ParticipantLeftAsync(meetingId, userId, currentCount);
        }

        public async Task<List<MeetingHistoryItemDto>> GetUserMeetingsAsync(Guid userId, string filter)
        {
            var query = _context.Meetings
                .IgnoreQueryFilters()
                .Include(m => m.Sport)
                .Include(m => m.Participants)
                .AsQueryable();

            var isActive = filter == "active";

            if (isActive)
            {
                query = query
                    .Where(m => !m.IsDeleted && !m.IsArchived)
                    .Where(m => m.Status != MeetingStatus.Completed && m.Status != MeetingStatus.Cancelled)
                    .Where(m => m.AuthorId == userId || m.Participants.Any(p => p.UserId == userId && !p.IsDeleted));
            }
            else // history
            {
                query = query
                    .Where(m => m.AuthorId == userId || m.Participants.Any(p => p.UserId == userId && !p.IsDeleted))
                    .Where(m => m.IsArchived || m.Status == MeetingStatus.Completed || m.Status == MeetingStatus.Cancelled);
            }

            var meetings = await query
                .OrderByDescending(m => m.ScheduledAt)
                .ToListAsync();

            return meetings.Select(m => new MeetingHistoryItemDto
            {
                Id = m.Id,
                Title = m.Title,
                SportName = m.Sport?.Name ?? "Спорт",
                SportColor = m.Sport?.Color ?? "#000000",
                Status = m.Status,
                ScheduledAt = m.ScheduledAt,
                ParticipantsCount = m.Participants.Count(p => !p.IsDeleted),
                MaxParticipants = m.MaxParticipants,
                IsReadOnly = m.IsArchived || m.Status == MeetingStatus.Completed || m.Status == MeetingStatus.Cancelled,
                Latitude = m.Location?.Y ?? 0,
                Longitude = m.Location?.X ?? 0
            }).ToList();
        }
    }
}
