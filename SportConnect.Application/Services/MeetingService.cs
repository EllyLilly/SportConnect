using SportConnect.Application.Exceptions;
using SportConnect.Core.DTOs.Meetings;
using SportConnect.Infrastructure.Data;
using SportConnect.Infrastructure.Entities;
using SportConnect.Core.Entities;
using NetTopologySuite.Geometries;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SportConnect.Application.Services
{
    public class MeetingService
    {
        private readonly SportConnectDbContext _context;

        public MeetingService(SportConnectDbContext context)
        {
            _context = context;
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

            return await GetByIdAsync(meeting.Id);
        }

        public async Task<MeetingDto> GetByIdAsync(Guid meetingId)
        {
            var meeting = await _context.Meetings
                .Include(m => m.Sport)
                .Include(m => m.Author)
                .Include(m => m.Participants)
                    .ThenInclude(p => p.User)
                .FirstOrDefaultAsync(m => m.Id == meetingId);

            if (meeting == null)
                throw new NotFoundException("Встреча не найдена");

            return MapToDto(meeting);
        }

        public async Task<MeetingDto> UpdateAsync(Guid meetingId, Guid userId, UpdateMeetingDto dto)
        {
            var meeting = await _context.Meetings
                .FirstOrDefaultAsync(m => m.Id == meetingId);

            if (meeting == null)
                throw new NotFoundException("Встреча не найдена");

            if (meeting.AuthorId != userId)
                throw new ConflictException("Только автор может редактировать встречу");

            meeting.Title = dto.Title;
            meeting.Description = dto.Description;
            meeting.Address = dto.Address;
            meeting.Location = new Point(dto.Longitude, dto.Latitude) { SRID = 4326 };
            meeting.ScheduledAt = dto.ScheduledAt.Kind == DateTimeKind.Utc
                ? dto.ScheduledAt
                : dto.ScheduledAt.ToUniversalTime();
            meeting.MinParticipants = dto.MinParticipants;
            meeting.MaxParticipants = dto.MaxParticipants;
            meeting.RequiredSkillLevel = dto.RequiredSkillLevel;
            meeting.Inventory = dto.Inventory;
            meeting.SportId = dto.SportId;
            meeting.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetByIdAsync(meetingId);
        }

        public async Task CancelAsync(Guid meetingId, Guid userId)
        {
            var meeting = await _context.Meetings
                .FirstOrDefaultAsync(m => m.Id == meetingId);

            if (meeting == null)
                throw new NotFoundException("Встреча не найдена");

            if (meeting.AuthorId != userId)
                throw new ConflictException("Только автор может отменить встречу");

            meeting.Status = MeetingStatus.Cancelled;
            meeting.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        private static MeetingDto MapToDto(Meeting m)
        {
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
                ParticipantsCount = m.Participants.Count,
                Participants = m.Participants.Select(p => new MeetingParticipantDto
                {
                    UserId = p.UserId,
                    UserName = p.User?.UserName ?? "Неизвестный",
                    JoinedAt = p.JoinedAt
                }).ToList(),
                CreatedAt = m.CreatedAt
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
            var meeting = await _context.Meetings
                .IgnoreQueryFilters()
                .Include(m => m.Participants)
                .FirstOrDefaultAsync(m => m.Id == meetingId);

            if (meeting == null)
                throw new NotFoundException("Встреча не найдена");

            if (meeting.Status == MeetingStatus.Cancelled
                || meeting.Status == MeetingStatus.Completed
                || meeting.Status == MeetingStatus.Started)
                throw new ConflictException("Нельзя присоединиться к этой встрече");

            var existingParticipant = meeting.Participants
                .FirstOrDefault(p => p.UserId == userId && !p.IsDeleted);

            if (existingParticipant != null)
                throw new ConflictException("Вы уже участвуете");

            var deletedParticipant = meeting.Participants
                .FirstOrDefault(p => p.UserId == userId && p.IsDeleted);

            if (deletedParticipant != null)
            {
                deletedParticipant.IsDeleted = false;
                deletedParticipant.DeletedAt = null;
                deletedParticipant.JoinedAt = DateTime.UtcNow;
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

            
            await _context.SaveChangesAsync();

            // Обновление статуса
            var actualCount = await _context.MeetingParticipants
                .Where(p => p.MeetingId == meetingId && !p.IsDeleted)
                .CountAsync();

            if (actualCount >= meeting.MaxParticipants)
            {
                meeting.Status = MeetingStatus.Full;
                await _context.SaveChangesAsync();
            }

            return await GetByIdAsync(meetingId);
        }

        public async Task LeaveAsync(Guid meetingId, Guid userId)
        {
            var participant = await _context.MeetingParticipants
                .FirstOrDefaultAsync(p => p.MeetingId == meetingId && p.UserId == userId);

            if (participant == null)
                throw new NotFoundException("Вы не участвуете в этой встрече");

            if (participant.IsDeleted)
                throw new ConflictException("Вы уже вышли из встречи");

            var meeting = await _context.Meetings
                .Include(m => m.Participants)
                .FirstOrDefaultAsync(m => m.Id == meetingId);

            if (meeting != null && meeting.AuthorId == userId)
                throw new ConflictException("Автор не может покинуть свою встречу");

            participant.IsDeleted = true;
            participant.DeletedAt = DateTime.UtcNow;

            //если Full — возврат в Recruiting
            if (meeting != null && meeting.Status == MeetingStatus.Full)
                meeting.Status = MeetingStatus.Recruiting;

            await _context.SaveChangesAsync();
        }
    }
}
