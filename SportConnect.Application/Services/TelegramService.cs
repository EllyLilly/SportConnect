using Microsoft.EntityFrameworkCore;
using SportConnect.Application.Abstractions;
using SportConnect.Application.DTOs.Telegram;
using SportConnect.Infrastructure.Data;
using SportConnect.Infrastructure.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SportConnect.Application.Services
{
    public class TelegramService
    {
        private readonly SportConnectDbContext _db;
        private readonly CurrentUserService _currentUser;

        public TelegramService(SportConnectDbContext db, CurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<GenerateTelegramCodeDto> GenerateCodeAsync(CancellationToken ct = default)
        {
            var userId = _currentUser.UserId ?? throw new UnauthorizedAccessException("Пользователь не авторизован");

            // Деактивируем старые неиспользованные коды
            var oldCodes = await _db.TelegramVerificationCodes
                .Where(c => c.UserId == userId && !c.IsUsed && c.ExpiresAt > DateTime.UtcNow)
                .ToListAsync(ct);

            foreach (var oldCode in oldCodes)
            {
                oldCode.IsUsed = true;
            }

            // Генерируем 6-значный код
            var code = new Random().Next(100000, 999999).ToString();
            var verificationCode = new TelegramVerificationCode
            {
                UserId = userId,
                Code = code,
                ExpiresAt = DateTime.UtcNow.AddMinutes(10),
                IsUsed = false
            };

            _db.TelegramVerificationCodes.Add(verificationCode);
            await _db.SaveChangesAsync(ct);

            return new GenerateTelegramCodeDto
            {
                Code = code,
                ExpiresAt = verificationCode.ExpiresAt
            };
        }

        public async Task<bool> ConnectAsync(string code, long chatId, CancellationToken ct = default)
        {
            var verificationCode = await _db.TelegramVerificationCodes
                .FirstOrDefaultAsync(c => c.Code == code && !c.IsUsed && c.ExpiresAt > DateTime.UtcNow, ct);

            if (verificationCode == null)
                return false;

            verificationCode.IsUsed = true;

            // Удаляем старую связь, если есть
            var existing = await _db.TelegramConnections
                .FirstOrDefaultAsync(tc => tc.UserId == verificationCode.UserId, ct);

            if (existing != null)
            {
                existing.ChatId = chatId;
                existing.IsActive = true;
                existing.ConnectedAt = DateTime.UtcNow;
            }
            else
            {
                _db.TelegramConnections.Add(new TelegramConnection
                {
                    UserId = verificationCode.UserId,
                    ChatId = chatId,
                    IsActive = true,
                    ConnectedAt = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task DisconnectAsync(CancellationToken ct = default)
        {
            var userId = _currentUser.UserId;
            var connection = await _db.TelegramConnections
                .FirstOrDefaultAsync(tc => tc.UserId == userId, ct);

            if (connection != null)
            {
                connection.IsActive = false;
                await _db.SaveChangesAsync(ct);
            }
        }

        public async Task<TelegramStatusDto> GetStatusAsync(CancellationToken ct = default)
        {
            var userId = _currentUser.UserId;
            var connection = await _db.TelegramConnections
                .AsNoTracking()
                .FirstOrDefaultAsync(tc => tc.UserId == userId && tc.IsActive, ct);

            return new TelegramStatusDto
            {
                IsConnected = connection != null,
                ConnectedAt = connection?.ConnectedAt
            };
        }

        public async Task<long?> GetChatIdByUserIdAsync(Guid userId, CancellationToken ct = default)
        {
            var connection = await _db.TelegramConnections
                .AsNoTracking()
                .FirstOrDefaultAsync(tc => tc.UserId == userId && tc.IsActive, ct);

            return connection?.ChatId;
        }
    }
}
