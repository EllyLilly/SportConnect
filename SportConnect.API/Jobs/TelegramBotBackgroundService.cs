using Microsoft.EntityFrameworkCore;
using SportConnect.Application.Services;
using SportConnect.Infrastructure.Data;
using Telegram.Bot;
using Telegram.Bot.Exceptions;
using Telegram.Bot.Polling;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;

namespace SportConnect.API.Jobs
{
    public class TelegramBotBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<TelegramBotBackgroundService> _logger;
        private ITelegramBotClient? _botClient;

        public TelegramBotBackgroundService(
            IServiceScopeFactory scopeFactory,
            IConfiguration configuration,
            ILogger<TelegramBotBackgroundService> logger)
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
                _logger.LogWarning("Telegram bot token not configured. TelegramBotBackgroundService is not starting.");
                return;
            }

            _botClient = new TelegramBotClient(botToken);

            var receiverOptions = new ReceiverOptions
            {
                AllowedUpdates = new[] { UpdateType.Message }
            };

            _logger.LogInformation("Telegram bot started. Listening for messages...");

            try
            {
                _botClient.StartReceiving(
                    updateHandler: HandleUpdateAsync,
                    errorHandler: HandleErrorAsync,
                    receiverOptions: receiverOptions,
                    cancellationToken: stoppingToken
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error starting Telegram bot");
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
            }
        }

        private async Task HandleUpdateAsync(ITelegramBotClient botClient, Update update, CancellationToken ct)
        {
            if (update.Message is not { } message || message.Text is not { } messageText)
                return;

            var chatId = message.Chat.Id;

            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<SportConnectDbContext>();
                var telegramService = scope.ServiceProvider.GetRequiredService<TelegramService>();

                if (messageText.StartsWith("/start"))
                {
                    await botClient.SendMessage(
                        chatId: chatId,
                        text: "Привет! Я бот SportConnect.\n\n" +
                              "Я буду присылать тебе уведомления о новых спортивных встречах рядом.\n\n" +
                              "Чтобы подключить уведомления:\n" +
                              "1. Зайди в свой профиль на SportConnect\n" +
                              "2. Нажми «Сгенерировать код»\n" +
                              "3. Отправь мне команду /connect <код>\n\n" +
                              "Например: /connect 123456",
                        cancellationToken: ct);
                }
                else if (messageText.StartsWith("/connect"))
                {
                    var parts = messageText.Split(' ');
                    if (parts.Length != 2)
                    {
                        await botClient.SendMessage(
                            chatId: chatId,
                            text: "Используй формат: /connect <код>\nНапример: /connect 123456",
                            cancellationToken: ct);
                        return;
                    }

                    var code = parts[1].Trim();
                    var success = await telegramService.ConnectAsync(code, chatId, ct);

                    if (success)
                    {
                        await botClient.SendMessage(
                            chatId: chatId,
                            text: "Уведомления подключены! Теперь ты будешь получать оповещения о новых встречах рядом.",
                            cancellationToken: ct);
                    }
                    else
                    {
                        await botClient.SendMessage(
                            chatId: chatId,
                            text: "Неверный или устаревший код. Попробуй сгенерировать новый код в профиле.",
                            cancellationToken: ct);
                    }
                }
                else if (messageText.StartsWith("/disconnect"))
                {
                    var userId = await db.TelegramConnections
                        .Where(tc => tc.ChatId == chatId && tc.IsActive)
                        .Select(tc => tc.UserId)
                        .FirstOrDefaultAsync(ct);

                    if (userId != Guid.Empty)
                    {
                        var connection = await db.TelegramConnections
                            .FirstOrDefaultAsync(tc => tc.UserId == userId, ct);

                        if (connection != null)
                        {
                            connection.IsActive = false;
                            await db.SaveChangesAsync(ct);
                        }

                        await botClient.SendMessage(
                            chatId: chatId,
                            text: "Уведомления отключены.",
                            cancellationToken: ct);
                    }
                    else
                    {
                        await botClient.SendMessage(
                            chatId: chatId,
                            text: "Ты ещё не подключён к SportConnect.",
                            cancellationToken: ct);
                    }
                }
                else
                {
                    await botClient.SendMessage(
                        chatId: chatId,
                        text: "Я понимаю только команды:\n/start - информация\n/connect <код> - подключить уведомления\n/disconnect - отключить уведомления",
                        cancellationToken: ct);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Telegram message from chat {ChatId}", chatId);
                try
                {
                    await botClient.SendMessage(
                        chatId: chatId,
                        text: "Произошла ошибка. Попробуй позже.",
                        cancellationToken: ct);
                }
                catch { }
            }
        }

        private Task HandleErrorAsync(ITelegramBotClient botClient, Exception exception, CancellationToken ct)
        {
            var errorMessage = exception switch
            {
                ApiRequestException apiRequestException =>
                    $"Telegram API Error:\n[{apiRequestException.ErrorCode}]\n{apiRequestException.Message}",
                _ => exception.ToString()
            };

            _logger.LogError("Telegram bot error: {ErrorMessage}", errorMessage);
            return Task.CompletedTask;
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Telegram bot stopping...");
            if (_botClient != null)
            {
                await _botClient.Close(cancellationToken);
            }
            await base.StopAsync(cancellationToken);
        }
    }
}
