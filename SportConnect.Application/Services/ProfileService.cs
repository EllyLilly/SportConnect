using Microsoft.EntityFrameworkCore;
using SportConnect.Application.Exceptions;
using SportConnect.Core.DTOs.Profile;
using SportConnect.Infrastructure.Data;
using SportConnect.Infrastructure.Entities;

namespace SportConnect.Application.Services;

public class ProfileService
{
    private readonly SportConnectDbContext _context;

    public ProfileService(SportConnectDbContext context)
    {
        _context = context;
    }

    public async Task<ProfileDto> GetProfileAsync(Guid userId)
    {
        var user = await _context.Users
            .AsNoTracking()
            .Include(u => u.SportPreferences)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            throw new NotFoundException("Пользователь не найден");

        return new ProfileDto
        {
            Email = user.Email ?? string.Empty,
            UserName = user.UserName,
            City = user.City,
            RadiusMeters = user.RadiusMeters,
            SkillLevel = user.SkillLevel,
            SportIds = user.SportPreferences.Select(sp => sp.SportId).ToList()
        };
    }

    public async Task<ProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileDto dto)
    {
        var user = await _context.Users
            .Include(u => u.SportPreferences)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            throw new NotFoundException("Пользователь не найден");

        user.City = dto.City;
        user.RadiusMeters = dto.RadiusMeters;
        user.SkillLevel = dto.SkillLevel;

        _context.UserSportPreferences.RemoveRange(user.SportPreferences);
        user.SportPreferences = dto.SportIds.Select(sportId => new UserSportPreference
        {
            UserId = userId,
            SportId = sportId
        }).ToList();

        await _context.SaveChangesAsync();

        return new ProfileDto
        {
            Email = user.Email ?? string.Empty,
            UserName = user.UserName,
            City = user.City,
            RadiusMeters = user.RadiusMeters,
            SkillLevel = user.SkillLevel,
            SportIds = user.SportPreferences.Select(sp => sp.SportId).ToList()
        };
    }
}
