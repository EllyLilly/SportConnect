using Microsoft.EntityFrameworkCore;
using SportConnect.Infrastructure.Data;
using Telegram.Bot;
using Telegram.Bot.Exceptions;

namespace SportConnect.API.Jobs
{
    public class NotificationBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<NotificationBackgroundService> _logger;

        public NotificationBackgroundService(
            IServiceScopeFactory scopeFactory,
            IConfiguration configuration,
            ILogger<NotificationBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _configuration = configuration;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var botToken = _configuration["Telegram:BotToken"];

            if (string.IsNullOrEmpty(botToken) || botToken == "YOUR_BOT_TOKEN_HERE")
            {
                _logger.LogWarning("Telegram bot token not configured. NotificationBackgroundService is not starting.");
                return;
            }

            var botClient = new TelegramBotClient(botToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<SportConnectDbContext>();

                    var pendingNotifications = await db.NotificationLogs
                        .Where(nl => nl.Status == "Pending")
                        .Take(20)
                        .ToListAsync(stoppingToken);

                    foreach (var notification in pendingNotifications)
                    {
                        try
                        {
                            var chatId = await db.TelegramConnections
                                .Where(tc => tc.UserId == notification.UserId && tc.IsActive)
                                .Select(tc => tc.ChatId)
                                .FirstOrDefaultAsync(stoppingToken);

                            if (chatId == 0)
                            {
                                notification.Status = "Failed";
                                notification.ErrorMessage = "Telegram not connected";
                                continue;
                            }

                            await botClient.SendMessage(
                                chatId: chatId,
                                text: notification.Content ?? "Новая встреча рядом!",
                                cancellationToken: stoppingToken);

                            notification.Status = "Sent";
                            notification.SentAt = DateTime.UtcNow;
                            notification.ErrorMessage = null;

                            _logger.LogInformation("Notification sent to user {UserId} for meeting {MeetingId}",
                                notification.UserId, notification.MeetingId);
                        }
                        catch (ApiRequestException ex) when (ex.ErrorCode == 403)
                        {
                            // Пользователь заблокировал бота
                            notification.Status = "Failed";
                            notification.ErrorMessage = "Bot blocked by user";

                            var connection = await db.TelegramConnections
                                .FirstOrDefaultAsync(tc => tc.UserId == notification.UserId, stoppingToken);

                            if (connection != null)
                            {
                                connection.IsActive = false;
                            }

                            _logger.LogWarning("User {UserId} blocked the bot", notification.UserId);
                        }
                        catch (Exception ex)
                        {
                            notification.Status = "Failed";
                            notification.ErrorMessage = ex.Message;
                            _logger.LogError(ex, "Error sending notification {NotificationId}", notification.Id);
                        }
                    }

                    await db.SaveChangesAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in NotificationBackgroundService");
                }

                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
        }
    }
}
