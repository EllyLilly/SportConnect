using SportConnect.Application.Abstractions;
using SportConnect.Infrastructure.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Channels;
using System.Threading.Tasks;

namespace SportConnect.Application.Services
{
    public class NotificationQueue : INotificationQueue
    {
        private readonly Channel<NotificationLog> _channel;

        public NotificationQueue()
        {
            _channel = Channel.CreateUnbounded<NotificationLog>();
        }

        public void Enqueue(NotificationLog notification)
        {
            _channel.Writer.TryWrite(notification);
        }

        public async Task<NotificationLog?> DequeueAsync(CancellationToken ct = default)
        {
            return await _channel.Reader.ReadAsync(ct);
        }
    }
}
