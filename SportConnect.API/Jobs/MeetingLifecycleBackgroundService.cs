using SportConnect.Application.Services;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;

namespace SportConnect.API.Jobs
{
    public class MeetingLifecycleBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<MeetingLifecycleBackgroundService> _logger;

        public MeetingLifecycleBackgroundService(
            IServiceScopeFactory scopeFactory,
            ILogger<MeetingLifecycleBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("MeetingLifecycleBackgroundService started");

            using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));

            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await ProcessLifecycleAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in MeetingLifecycleBackgroundService");
                }
            }

            _logger.LogInformation("MeetingLifecycleBackgroundService stopped");
        }

        private async Task ProcessLifecycleAsync(CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var lifecycleService = scope.ServiceProvider.GetRequiredService<MeetingLifecycleService>();

            await lifecycleService.ProcessScheduledMeetingsAsync(cancellationToken);
            await lifecycleService.ProcessStartedMeetingsAsync(cancellationToken);
            await lifecycleService.PurgeOldCancelledMeetingsAsync(cancellationToken);
        }
    }
}
